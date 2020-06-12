import {DiceFactory} from './DiceFactory.js';
import {DiceBox} from './DiceBox.js';
import {DiceColors, TEXTURELIST, COLORSETS} from './DiceColors.js';

Hooks.once('init', () => {

    game.settings.registerMenu("dice-so-nice", "dice-so-nice", {
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
        default: Dice3D.DEFAULT_OPTIONS,
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
            const messageOptions = {rollMode};
            CONFIG.ChatMessage.entityClass.create(chatData, messageOptions);
        });

        return chatData;
    };

    DiceColors.ImageLoader(TEXTURELIST, function(images) {
		game.dice3d.diceTextures = images;

		// init colorset textures
        DiceColors.initColorSets();
	});
});

Hooks.on('chatMessage', (chatLog, message, chatData) => {

    let [command, match] = chatLog.constructor.parse(message);
    if (!match) throw new Error("Unmatched chat command");

    if(["roll", "gmroll", "blindroll", "selfroll"].includes(command)) {
        chatLog._processDiceCommand(command, match, chatData, {});
        chatData.roll.toMessage(chatData, { rollMode: command });
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

    static prepareTextureList(){
        return Object.keys(TEXTURELIST).reduce((i18nCfg, key) => {
                i18nCfg[key] = game.i18n.localize(TEXTURELIST[key].name);
                return i18nCfg;
            }, {}
        );
    };

    static prepareColorsetList(){
        return Object.keys(COLORSETS).reduce((i18nCfg, key) => {
            i18nCfg[key] = game.i18n.localize(COLORSETS[key].description);
            return i18nCfg;
        }, {}
    );
    };
}

/**
 * Main class to handle 3D Dice animations.
 */
export class Dice3D {

    static get DEFAULT_OPTIONS() {
        return {
            enabled: true,
            labelColor: Utils.contrastOf(game.user.color),
            diceColor: game.user.color,
            outlineColor: game.user.color,
            texture: "none",
            colorset: "custom",
            hideAfterRoll: true,
            timeBeforeHide: 2000,
            hideFX: 'fadeOut',
            autoscale: true,
            scale: 75,
            speed: 1,
            shadowQuality: 'high',
            sounds: true
        };
    }

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
        const config = mergeObject(Dice3D.DEFAULT_OPTIONS, game.settings.get("dice-so-nice", "settings"));

        this.DiceFactory = new DiceFactory();
        this.box = new DiceBox(this.canvas[0], this.DiceFactory, config);
		this.box.initialize();
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
            if(!data.whisper || data.whisper.map(user => user._id).includes(game.user._id)) {
                this._showAnimation(data.formula, data.results, data.dsnConfig).then(() => {
                    //??
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
     * @param whisper
     * @param blind
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

                game.socket.emit("module.dice-so-nice", mergeObject(data, { user: game.user._id, dsnConfig: game.settings.get('dice-so-nice', 'settings')}), () => {

                    if(!data.blind || data.whisper.map(user => user._id).includes(game.user._id)) {
                        this._showAnimation(data.formula, data.results, data.dsnConfig).then(displayed => {
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
     * @returns {Promise<boolean>}
     * @private
     */
    _showAnimation(formula, results, dsnConfig) {
        return new Promise((resolve, reject) => {
            if(this.isEnabled() && !this.box.rolling) {
                this._beforeShow();
                this.box.start_throw(formula, results, dsnConfig, () => {
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
            width: 500,
            height: 820,
            closeOnSubmit: true
        })
    }

    getData(options) {
        return mergeObject({
                speed: 1,
                shadowQuality: "high",
                outlineColor: '#FFFFFF',
                texture: "none",
                colorset: "custom",
                sounds:true,
                fxList: Utils.localize({
                    "none": "DICESONICE.None",
                    "fadeOut": "DICESONICE.FadeOut"
                }),
                speedList: Utils.localize({
                    "1": "DICESONICE.NormalSpeed",
                    "2": "DICESONICE.2xSpeed",
                    "3": "DICESONICE.3xSpeed"
                }),
                textureList: Utils.prepareTextureList(),
                colorsetList: Utils.prepareColorsetList(),
                shadowQualityList: Utils.localize({
                    "none": "DICESONICE.None",
                    "low": "DICESONICE.Low",
                    "high" : "DICESONICE.High"
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
            {dimensions: { w: 500, h: 300 }, autoscale: false, scale: 70}
        );

        this.diceFactory = new DiceFactory();
        this.box = new DiceBox(canvas, this.diceFactory, config);
        this.box.initialize();
        this.box.showcase();

        this.toggleHideAfterRoll();
        this.toggleAutoScale();

        html.find('input[name="hideAfterRoll"]').change(this.toggleHideAfterRoll.bind(this));
        html.find('input[name="autoscale"]').change(this.toggleAutoScale.bind(this));
        html.find('input,select').change(this.onApply.bind(this));
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

        setTimeout(() => {

            let config = {
                labelColor: $('input[name="labelColor"]').val(),
                diceColor: $('input[name="diceColor"]').val(),
                outlineColor: $('input[name="outlineColor"]').val(),
                autoscale: false,
                scale: 300,
                shadowQuality:$('select[name="shadowQuality"]').val(),
                colorset: $('select[name="colorset"]').val(),
                texture: $('select[name="texture"]').val(),
                sounds: $('input[name="sounds"]').val() == "on"
            };

            this.box.update(config);
            this.box.showcase(config);
        }, 100);
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