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
        scope: "world",
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
            game.diceBox.update(settings);
        }
    });
});

Hooks.once('ready', () => {

    let canvasHtml = $('<div id="dice-box-canvas" style="position: absolute; left: 0; top: 0; z-index: 1000; pointer-events: none;"></div>');
    canvasHtml.appendTo($('body'));

    let canvas = document.getElementById('dice-box-canvas');
    canvas.style.width = window.innerWidth - 1 + 'px';
    canvas.style.height = window.innerHeight - 1 + 'px';

    const config = game.settings.get('dice-so-nice', 'settings');
    let box = new DiceBox(canvas, {
        labelColor: config.labelColor,
        diceColor: config.diceColor,
        autoscale: config.autoscale,
        scale: config.scale
    });
    game.diceBox = box;

    window.addEventListener("resize", () => {
        canvas.style.width = window.innerWidth - 1 + 'px';
        canvas.style.height = window.innerHeight - 1 + 'px';
    });

    $('body,html').click(function() {
        const config = game.settings.get('dice-so-nice', 'settings');
        let diceBoxCanvas = $("#dice-box-canvas");
        if(!config.hideAfterRoll && diceBoxCanvas.is(":visible")) {
            diceBoxCanvas.hide();
        }
    });

    const original = Roll.prototype.toMessage;
    Roll.prototype.toMessage = function (chatData={}, {rollMode=null, create=true}={}) {

        const config = game.settings.get('dice-so-nice', 'settings');
        if(!config.enabled) {
            original.apply(this, arguments);
            return;
        }

        if(box.rolling) {
            return;
        }

        if(this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
        }

        chatData = original.apply(this, [chatData, {rollMode, create:false}]);

        let formula = '';
        let results = [];

        this.dice.forEach(dice => {
            if([4, 6, 8, 10, 12, 20, 100].includes(dice.faces)) {
                let separator = formula.length > 1 ? ' + ' : '';
                let rolls = Math.min(dice.rolls.length, 20);
                formula += separator + (dice.rolls.length > 1 ? `${rolls}d${dice.faces}` : `d${dice.faces}`);
                if(dice.faces === 100) {
                    formula += ' + ' + (dice.rolls.length > 1 ? `${rolls}d10` : `d10`);
                }

                for(let i = 0; i < rolls; i++) {
                    let r = dice.rolls[i];
                    if(dice.faces === 100) {
                        results.push(parseInt(r.roll/10));
                        results.push(r.roll%10);
                    } else {
                        results.push(r.roll);
                    }
                }
            }
        });

        if(formula.length > 0 && !chatData.blind) {

            let $dice = $("#dice-box-canvas");
            $dice.stop(true, true);
            $dice.show();

            box.start_throw(
                () => { return box.parse_notation(formula) },
                (vectors, notation, callback) => {
                    AudioHelper.play({src: chatData.sound});
                    callback(results);
                },
                () => {
                    ChatMessage.create(mergeObject(chatData, { sound: null }));

                    if(config.hideAfterRoll) {
                        this.timeoutHandle = setTimeout(() => {
                            if(!box.rolling) {
                                if(config.hideFX === 'none') {
                                    $dice.hide();
                                }
                                if(config.hideFX === 'fadeOut') {
                                    $dice.fadeOut(1000);
                                }
                            }
                        }, config.timeBeforeHide);
                    }
                }
            );
        } else {
            ChatMessage.create(chatData);
        }
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

class Utils {

    static localize(cfg) {
        return Object.keys(cfg).reduce((i18nCfg, key) => {
                i18nCfg[key] = game.i18n.localize(cfg[key]);
                return i18nCfg;
            }, {}
        );
    };
}

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