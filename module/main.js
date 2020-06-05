import {DiceFactory} from './DiceFactory.js';
import {DiceFavorites} from './DiceFavorites.js';
import {DiceFunctions} from './DiceFunctions.js';
import {DiceBox} from './DiceBox.js';

Hooks.once('init', () => {

    game.settings.registerMenu("module", "dice-so-nice", {
        name: "DICESONICE.config",
        label: "DICESONICE.configTitle",
        hint: "DICESONICE.configHint",
        icon: "fas fa-dice-d20",
        type: DiceConfig,
        restricted: false
    });
});

Hooks.once('ready', () => {

    game.settings.register("dice-so-nice", "settings", {
        name: "3D Dice Settings",
        scope: "client",
        default: {
            enabled: true,
            labelColor: Utils.contrastOf(game.user.color),
            diceColor: game.user.color,
            hideAfterRoll: true,
            timeBeforeHide: 2000,
            hideFX: 'fadeOut',
            autoscale: true,
            scale: 75,
            speed: 1
        },
        type: Object,
        config: false,
        onChange: settings => {
            game.dice3d.update(settings);
        }
    });

    game.dice3d = new Dice3D();

    const original = Roll.prototype.toMessage;
    Roll.prototype.toMessage = function (chatData={}, {rollMode=null, create=true}={}) {

        if(!create) {
            return original.apply(this, arguments);
        }

        chatData = original.apply(this, [chatData, {rollMode, create:false}]);

        let blind = false, whisper;
        rollMode = rollMode || game.settings.get("core", "rollMode");
        if ( ["gmroll", "blindroll"].includes(rollMode) ) whisper = ChatMessage.getWhisperRecipients("GM");
        if ( rollMode === "blindroll" ) blind = true;
        if ( rollMode === "selfroll" ) whisper = [game.user.id];

        game.dice3d.showForRoll(this, whisper, blind).then(displayed => {
            chatData = displayed ? mergeObject(chatData, { sound: null }) : chatData;
            ChatMessage.create(chatData);
        });

        return chatData;
    };
});

Hooks.on('chatMessage', (chatLog, message, chatData) => {

    let [command, match] = chatLog.constructor.parse(message);
    if (!match) throw new Error("Unmatched chat command");

    if(command === 'roll') {
        chatLog._processDiceCommand(command, match, chatData, {});
        chatData.roll.toMessage(chatData);
        return false;
    }

});

/**
 * Generic utilities class...
 */
class Utils {

    /**
     *
     * @param cfg
     * @returns {{}}
     */
    static localize(cfg) {
        return Object.keys(cfg).reduce((i18nCfg, key) => {
                i18nCfg[key] = game.i18n.localize(cfg[key]);
                return i18nCfg;
            }, {}
        );
    };

    /**
     * Get the contrasting color for any hex color.
     *
     * @returns {String} The contrasting color (black or white)
     */
    static contrastOf(color){

        if (color.slice(0, 1) === '#') {
            color = color.slice(1);
        }

        if (color.length === 3) {
            color = color.split('').map(function (hex) {
                return hex + hex;
            }).join('');
        }

        const r = parseInt(color.substr(0,2),16);
        const g = parseInt(color.substr(2,2),16);
        const b = parseInt(color.substr(4,2),16);

        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

        return (yiq >= 128) ? '#000000' : '#FFFFFF';
    };
}

/**
 * Main class to handle 3D Dice animations.
 */
export class Dice3D {

    /**
     * Ctor. Create and initialize a new Dice3d.
     */
    constructor() {
        this._buildCanvas();
        this._buildDiceBox();
        this._initListeners();
    }

    /**
     * Create and inject the dice box canvas resizing to the window total size.
     *
     * @private
     */
    _buildCanvas() {
        this.canvas = $('<div id="dice-box-canvas" style="position: absolute; left: 0; top: 0; z-index: 1000; pointer-events: none;"></div>');
        this.canvas.appendTo($('body'));
        this._resizeCanvas();
    }

    /**
     * resize to the window total size.
     *
     * @private
     */
    _resizeCanvas() {
        const sidebarWidth = $('#sidebar').width();
        this.canvas.width(window.innerWidth - sidebarWidth + 'px');
        this.canvas.height(window.innerHeight - 1 + 'px');
    }

    /**
     * Build the dicebox.
     *
     * @private
     */
    _buildDiceBox() {
        const config = game.settings.get('dice-so-nice', 'settings');

        this.DiceFavorites = new DiceFavorites();
        this.DiceFactory = new DiceFactory();
        this.box = new DiceBox(this.canvas[0], { w: 500, h: 300 }, this.DiceFactory, this.DiceFavorites);
		//$t.DiceBox.selector.dice = ['df', 'd4', 'd6', 'd8', 'd10', 'd100', 'd12', 'd20'];
		this.box.initialize();

		this.box.volume = parseInt(this.DiceFavorites.settings.volume.value);
		this.box.sounds = this.DiceFavorites.settings.sounds.value == '1';

		this.DiceFunctions = new DiceFunctions(this.box);
        /*this.box = new DiceBox(this.canvas[0], {
            labelColor: config.labelColor,
            diceColor: config.diceColor,
            autoscale: config.autoscale,
            scale: config.scale,
            speed: config.speed ? config.speed : 1
        });*/
    }

    /**
     * Init listeners on windows resize and on click if auto hide has been disabled within the settings.
     *
     * @private
     */
    _initListeners() {
        $(window).resize(() => {
            this._resizeCanvas();
            //this.box.reinit();
            //this.box.resetCache();
        });
        $('body,html').click(() => {
            const config = game.settings.get('dice-so-nice', 'settings');
            if(!config.hideAfterRoll && this.canvas.is(":visible")) {
                this.canvas.hide();
            }
        });
        game.socket.on('module.dice-so-nice', (data) => {
            const diceColor = game.users.get(data.user).color;
            const labelColor = Utils.contrastOf(diceColor);
            if(!data.whisper || data.whisper.map(user => user._id).includes(game.user._id)) {
                this.box.updateColors(diceColor, labelColor);
                this._showAnimation(data.formula, data.results).then(() => {
                    const config = game.settings.get('dice-so-nice', 'settings');
                    this.box.updateColors(config.diceColor, config.labelColor);
                });
            }
        });
    }

    /**
     * Check if 3D simulation is enabled from the settings.
     */
    isEnabled() {
        const config = game.settings.get('dice-so-nice', 'settings');
        return config.enabled;
    }

    /**
     * Update the DiceBox with fresh new settgins.
     *
     * @param settings
     */
    update(settings) {
        this.box.update(settings);
    }

    /**
     * Show the 3D Dice animation for the
     *
     * @param roll an instance of Roll class to show 3D dice animation.
     * @returns {Promise<boolean>} when resolved true if roll is if the animation was displayed, false if not.
     */
    showForRoll(roll, whisper, blind) {
        return this.show(new RollData(roll, whisper, blind));
    }

    /**
     * Show
     *
     * @param data data containing the formula and the result to show in the 3D animation.
     * @returns {Promise<boolean>} when resolved true if roll is if the animation was displayed, false if not.
     */
    show(data) {
        return new Promise((resolve, reject) => {

            if (!data) throw new Error("Roll data should be not null");

            const isEmpty = data.formula.length === 0 || data.results.length === 0;
            if(!isEmpty) {

                game.socket.emit("module.dice-so-nice", mergeObject(data, { user: game.user._id }), () => {

                    if(!data.blind || data.whisper.includes(game.user._id)) {
                        this._showAnimation(data.formula, data.results).then(displayed => {
                            resolve(displayed);
                        });
                    } else {
                        resolve(false);
                    }
                });
            } else {
                resolve(false);
            }
        });
    }

    /**
     *
     * @param formula
     * @param results
     * @returns {Promise<unknown>}
     * @private
     */
    _showAnimation(formula, results) {
        return new Promise((resolve, reject) => {
            if(this.isEnabled() && !this.box.rolling) {
                this._beforeShow();
                this.box.start_throw(
                    formula,
                    (vectors, notation, callback) => {
                        //AudioHelper.play({src: CONFIG.sounds.dice});
                        callback(results);
                    },
                    () => {
                        resolve(true);
                        this._afterShow();
                    }
                );
            } else {
                resolve(false);
            }
        });
    }

    /**
     *
     * @private
     */
    _beforeShow() {
        if(this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
        }

        this.canvas.stop(true, true);
        this.canvas.show();
    }

    /**
     *
     * @private
     */
    _afterShow() {
        const config = game.settings.get('dice-so-nice', 'settings');
        if(config.hideAfterRoll) {
            this.timeoutHandle = setTimeout(() => {
                if(!this.box.rolling) {
                    if(config.hideFX === 'none') {
                        this.canvas.hide();
                    }
                    if(config.hideFX === 'fadeOut') {
                        this.canvas.fadeOut(1000);
                    }
                }
            }, config.timeBeforeHide);
        }
    }

    copyto(obj, res) {
        if (obj == null || typeof obj !== 'object') return obj;
        if (obj instanceof Array) {
            for (var i = obj.length - 1; i >= 0; --i)
                res[i] = Dice3D.copy(obj[i]);
        }
        else {
            for (var i in obj) {
                if (obj.hasOwnProperty(i))
                    res[i] = Dice3D.copy(obj[i]);
            }
        }
        return res;
    }

    copy(obj) {
        if (!obj) return obj;
        return Dice3D.copyto(obj, new obj.constructor());
    }

    hidden(obj, hidden, display = 'block') {
        if(!obj) return;
        obj.style.display = (hidden) ? 'none' : display;
        obj.style.visibility = (hidden) ? 'hidden' : 'visible';
    }

    element(name, props, place, content) {
        var dom = document.createElement(name);
        if (props) for (var i in props) dom.setAttribute(i, props[i]);
        if (place) place.appendChild(dom);
        if (content !== undefined) Dice3D.inner(content, dom);
        return dom;
    }

    inner(obj, sel) {
        sel.appendChild(obj.nodeName != undefined ? obj : document.createTextNode(obj));
        return sel;
    }

    id(id) {
        return document.getElementById(id);
    }

    set(sel, props) {
        for (var i in props) sel.setAttribute(i, props[i]);
        return sel;
    }

    selectByValue(sel, value) {
        for(var i=0;i<sel.options.length;i++){
            if (sel.options[i].value == value) {
                sel.selectedIndex = i;
                return;
            }
        }
        sel.selectedIndex = -1;
    }

    clas(sel, oldclass, newclass) {
        var oc = oldclass ? oldclass.split(/\s+/) : [],
            nc = newclass ? newclass.split(/\s+/) : [],
            classes = (sel.getAttribute('class') || '').split(/\s+/);
        if (!classes[0]) classes = [];
        for (var i in oc) {
            var ind = classes.indexOf(oc[i]);
            if (ind >= 0) classes.splice(ind, 1);
        }
        for (var i in nc) {
            if (nc[i] && classes.indexOf(nc[i]) < 0) classes.push(nc[i]);
        }
        sel.setAttribute('class', classes.join(' '));
    }

    empty(sel) {
        if (sel.childNodes)
            while (sel.childNodes.length)
                sel.removeChild(sel.firstChild);
    }

    remove(sel) {
        if (sel) {
            if (sel.parentNode) sel.parentNode.removeChild(sel);
            else for (var i = sel.length - 1; i >= 0; --i)
                sel[i].parentNode.removeChild(sel[i]);
        }
    }

    bind(sel, eventname, func, bubble) {
        if (!sel) return;
        if (eventname.constructor === Array) {
            for (var i in eventname)
                sel.addEventListener(eventname[i], func, bubble ? bubble : false);
        }
        else
            sel.addEventListener(eventname, func, bubble ? bubble : false);
    }

    unbind(sel, eventname, func, bubble) {
        if (eventname.constructor === Array) {
            for (var i in eventname)
                sel.removeEventListener(eventname[i], func, bubble ? bubble : false);
        }
        else
            sel.removeEventListener(eventname, func, bubble ? bubble : false);
    }

    one(sel, eventname, func, bubble) {
        var one_func = function(e) {
            func.call(this, e);
            Dice3D.unbind(sel, eventname, one_func, bubble);
        };
        Dice3D.bind(sel, eventname, one_func, bubble);
    }

    raise_event(sel, eventname, bubble, cancelable) {
        var evt = document.createEvent('UIEvents');
        evt.initEvent(eventname, bubble == undefined ? true : bubble,
                cancelable == undefined ? true : cancelable);
        sel.dispatchEvent(evt);
    }

    raise(sel, eventname, params, bubble, cancelable) {
        var ev = document.createEvent("CustomEvent");
        ev.initCustomEvent(eventname, bubble, cancelable, params);
        sel.dispatchEvent(ev);
    }

    get_elements_by_class(classes, node) {
        return (node || document).getElementsByClassName(classes);
    }

    uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    get_url_params() {
        var params = window.location.search.substring(1).split("&");
        var res = {};
        for (var i in params) {
            var keyvalue = params[i].split("=");
            res[keyvalue[0]] = decodeURI(keyvalue[1]);
        }
        return res;
    }

    get_mouse_coords(ev) {
        if (ev && ev.changedTouches && ev.changedTouches.length > 0) return { x: ev.changedTouches[0].clientX, y: ev.changedTouches[0].clientY };
        return { x: ev.clientX, y: ev.clientY };
    }

    deferred() {
        var solved = false, callbacks = [], args = [];
        function solve() {
            while (callbacks.length) {
                callbacks.shift().apply(this, args);
            }
        }
        return {
            promise: function() {
                return {
                    then: function(callback) {
                        var deferred = Dice3D.deferred(), promise = deferred.promise();
                        callbacks.push(function() { 
                            var res = callback.apply(this, arguments);
                            if (res && 'done' in res) res.done(deferred.resolve);
                            else deferred.resolve.apply(this, arguments); 
                        });
                        return promise;
                    },
                    done: function(callback) {
                        callbacks.push(callback);
                        if (solved) solve();
                        return this;
                    },
                    cancel: function() {
                        callbacks = [];
                    }
                };
            },
            resolve: function() {
                solved = true;
                args = Array.prototype.slice.call(arguments, 0);
                solve();
            }
        };
    }

    when(promises) {
        var deferred = Dice3D.deferred();
        var count = promises.length, ind = 0;
        if (count == 0) deferred.resolve();
        for (var i = 0; i < count; ++i) {
            promises[i].done(function() {
                if (++ind == count) deferred.resolve();
            });
        }
        return deferred.promise();
    }
}


/**
 *
 */
class RollData {

    constructor(roll, whisper, blind) {

        if (!roll) throw new Error("Roll instance should be not null");

        if ( !roll._rolled ) roll.roll();

        this.formula = '';
        this.results = [];
        this.whisper = whisper;
        this.blind = blind;

        roll.dice.forEach(dice => {
            if([4, 6, 8, 10, 12, 20, 100].includes(dice.faces)) {
                let separator = this.formula.length > 1 ? ' + ' : '';
                let rolls = Math.min(dice.rolls.length, 20);
                this.formula += separator + (dice.rolls.length > 1 ? `${rolls}d${dice.faces}` : `d${dice.faces}`);
                if(dice.faces === 100) {
                    this.formula += ' + ' + (dice.rolls.length > 1 ? `${rolls}d10` : `d10`);
                }

                for(let i = 0; i < rolls; i++) {
                    let r = dice.rolls[i];
                    if(dice.faces === 100) {
                        this.results.push(parseInt(r.roll/10));
                        this.results.push(r.roll%10);
                    } else {
                        this.results.push(r.roll);
                    }
                }
            }
        });
    }

}

/**
 * Form application to configure settings of the 3D Dice.
 */
class DiceConfig extends FormApplication {

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: game.i18n.localize("DICESONICE.configTitle"),
            id: "dice-config",
            template: "modules/dice-so-nice/templates/dice-config.html",
            width: 350,
            height: 600,
            closeOnSubmit: true
        })
    }

    getData(options) {
        return mergeObject({
                speed: 1,
                fxList: Utils.localize({
                    "none": "DICESONICE.None",
                    "fadeOut": "DICESONICE.FadeOut"
                }),
                speedList: Utils.localize({
                    "1": "DICESONICE.NormalSpeed",
                    "2": "DICESONICE.2xSpeed",
                    "3": "DICESONICE.3xSpeed"
                })
            },
            game.settings.get('dice-so-nice', 'settings')
        );
    }

    activateListeners(html) {
        super.activateListeners(html);

        let canvas = document.getElementById('dice-gonfiguration-canvas');
        let config = mergeObject(
            game.settings.get('dice-so-nice', 'settings'),
            {dimensions: { w: 500, h: 300 }, autoscale: false, scale: 300}
        );

        this.box = new DiceBox(canvas, config);
        this.box.showcase();

        this.toggleHideAfterRoll();
        this.toggleAutoScale();

        html.find('input[name="hideAfterRoll"]').change(this.toggleHideAfterRoll.bind(this));
        html.find('input[name="autoscale"]').change(this.toggleAutoScale.bind(this));
        html.find('button[name="apply"]').click(this.onApply.bind(this));
    }

    toggleHideAfterRoll() {
        let hideAfterRoll = $('input[name="hideAfterRoll"]')[0].checked;
        $('input[name="timeBeforeHide"]').prop("disabled", !hideAfterRoll);
        $('select[name="hideFX"]').prop("disabled", !hideAfterRoll);
    }

    toggleAutoScale() {
        let autoscale = $('input[name="autoscale"]')[0].checked;
        $('input[name="scale"]').prop("disabled", autoscale);
    }

    onApply(event) {
        event.preventDefault();

        this.box.update({
            labelColor: $('input[name="labelColor"]').val(),
            diceColor: $('input[name="diceColor"]').val(),
            autoscale: false,
            scale: 300
        });
        this.box.showcase();
    }

    async _updateObject(event, formData) {
        let settings = mergeObject(
            game.settings.get('dice-so-nice', 'settings'),
            formData
        );
        await game.settings.set('dice-so-nice', 'settings', settings);
        ui.notifications.info(`Updated 3D Dice Settings Configuration.`);
    }

}