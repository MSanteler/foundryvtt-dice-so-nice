import {DiceBox} from "./dice.js";

Hooks.once('init', () => {

    /*game.settings.registerMenu("module", "dice-so-nice", {
        name: "DICESONICE.config",
        label: "DICESONICE.configTitle",
        hint: "DICESONICE.configTitle",
        type: DiceConfig,
        restricted: false
    });*/
});

Hooks.once('ready', () => {

    let canvasHtml = $('<div id="dice-box-canvas" style="position: absolute; left: 0; top: 0; z-index: 1000; pointer-events: none;"></div>');
    canvasHtml.appendTo($('body'));

    let canvas = document.getElementById('dice-box-canvas');
    canvas.style.width = window.innerWidth - 1 + 'px';
    canvas.style.height = window.innerHeight - 1 + 'px';

    let box = new DiceBox(canvas);

    window.addEventListener("resize", () => {
        canvas.style.width = window.innerWidth - 1 + 'px';
        canvas.style.height = window.innerHeight - 1 + 'px';

        console.log('w: ' + canvas.style.width);
        console.log('h: ' + canvas.style.height);


        /*renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();*/
    });

    const original = Roll.prototype.toMessage;
    Roll.prototype.toMessage = function (chatData={}, {rollMode=null, create=true}={}) {

        if(box.rolling) {
            return;
        }

        chatData = original.apply(this, [chatData, {rollMode, create:false}]);

        let formula = '';
        let results = [];
        this.dice.forEach(dice => {
            if([4, 6, 8, 10, 12, 20].includes(dice.faces)) {
                let separator = formula.length > 1 ? ' + ' : '';
                formula += separator + (dice.rolls.length > 1 ? `${dice.rolls.length}d${dice.faces}` : `d${dice.faces}`);
                dice.rolls.forEach(r => {
                    results.push(r.roll);
                });
            }
        });

        if(formula.length > 0) {
            $("#dice-box-canvas").stop(true, true);
            $("#dice-box-canvas").show();

            box.start_throw(
                () => { return box.parse_notation(formula) },
                (vectors, notation, callback) => {
                    AudioHelper.play({src: chatData.sound});
                    callback(results);
                },
                () => {
                    ChatMessage.create(mergeObject(chatData, { sound: null }));
                    setTimeout(() => {
                        $('#dice-box-canvas').fadeOut(1000);
                    }, 2000);
                }
            );
        } else {
            ChatMessage.create(chatData);
        }
    };

    $("#canvas").hide();
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

class DiceConfig extends FormApplication {

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: game.i18n.localize("DICESONICE.configTitle"),
            id: "dice-config",
            template: "modules/dice-so-nice/templates/dice-config.html",
            width: 820,
            height: 400,
            closeOnSubmit: true
        })
    }

    getData(options) {
        return {
        }
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        let canvas = document.getElementById('dice-gonfiguration-canvas');
        let box = new DiceBox(canvas, { w: 500, h: 300 });
        box.draw_selector();
    }

}