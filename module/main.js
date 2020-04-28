import {DiceBox} from "./dice.js";

Hooks.once('init', () => {

    game.settings.registerMenu("module", "dice-so-nice", {
        name: "DICESONICE.config",
        label: "DICESONICE.configTitle",
        hint: "DICESONICE.configHint",
        icon: "fas fa-dice-d20",
        type: DiceConfig,
        restricted: false
    });

    game.settings.register("dice-so-nice", "settings", {
        name: "3D Dice Settings",
        scope: "client",
        default: {
            enabled: true,
            labelColor: '#000000',
            diceColor: '#b72a1d',
            hideAfterRoll: true,
            timeBeforeHide: 2000,
            hideFX: 'fadeOut',
            autoscale: true,
            scale: 75
        },
        type: Object,
        config: false,
        onChange: settings => {
            game.dice3d.update(settings);
        }
    });
});

Hooks.once('ready', () => {

    game.dice3d = new Dice3D();

    const original = Roll.prototype.toMessage;
    Roll.prototype.toMessage = function (chatData={}, {rollMode=null, create=true}={}) {

        if(!game.dice3d.isEnabled()) {
            original.apply(this, arguments);
            return;
        }

        chatData = original.apply(this, [chatData, {rollMode, create:false}]);

        game.dice3d.showForRoll(this).then(displayed => {
            chatData = displayed ? mergeObject(chatData, { sound: null }) : chatData;
            ChatMessage.create(chatData);
        });
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
        this.canvas.width(window.innerWidth - 1 + 'px');
        this.canvas.height(window.innerHeight - 1 + 'px');
    }

    /**
     * Build the dicebox.
     *
     * @private
     */
    _buildDiceBox() {
        const config = game.settings.get('dice-so-nice', 'settings');
        this.box = new DiceBox(this.canvas[0], {
            labelColor: config.labelColor,
            diceColor: config.diceColor,
            autoscale: config.autoscale,
            scale: config.scale
        });
    }

    /**
     * Init listeners on windows resize and on click if auto hide has been disabled within the settings.
     *
     * @private
     */
    _initListeners() {
        $(window).resize(() => {
            this._resizeCanvas()
        });
        $('body,html').click(() => {
            const config = game.settings.get('dice-so-nice', 'settings');
            if(!config.hideAfterRoll && this.canvas.is(":visible")) {
                this.canvas.hide();
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
    showForRoll(roll) {
        return this.show(new RollData(roll));
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

            if(!isEmpty && !this.box.rolling) {

                this._beforeShow();

                this.box.start_throw(
                    () => {
                        let notation = this.box.parse_notation(data.formula);
                        if(notation.error) {
                            throw new Error("Roll data contains errors");
                        }

                        return notation;
                    },
                    (vectors, notation, callback) => {
                        AudioHelper.play({src: CONFIG.sounds.dice});
                        callback(data.results);
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
}


/**
 *
 */
class RollData {

    constructor(roll) {

        if (!roll) throw new Error("Roll instance should be not null");

        if ( !roll._rolled ) roll.roll();

        this.formula = '';
        this.results = [];

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
            height: 580,
            closeOnSubmit: true
        })
    }

    getData(options) {
        return mergeObject(
            game.settings.get('dice-so-nice', 'settings'),
            {
                fxList: Utils.localize({
                    "none": "DICESONICE.None",
                    "fadeOut": "DICESONICE.FadeOut"
                })
            }
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