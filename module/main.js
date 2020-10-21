import { DiceFactory } from './DiceFactory.js';
import { DiceBox } from './DiceBox.js';
import { DiceColors, TEXTURELIST, COLORSETS } from './DiceColors.js';
import { DiceNotation } from './DiceNotation.js';

/**
 * Registers the exposed settings for the various 3D dice options.
 */
Hooks.once('init', () => {

    game.settings.registerMenu("dice-so-nice", "dice-so-nice", {
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
        default: Dice3D.DEFAULT_OPTIONS,
        type: Object,
        config: false,
        onChange: settings => {
            if (game.dice3d) {
                if((game.dice3d.currentCanvasPosition != settings.canvasZIndex)||(game.dice3d.currentBumpMapping != settings.bumpMapping))
                    location.reload();
                else
                    game.dice3d.update(settings);
            }
        }
    });

    game.settings.register("dice-so-nice", "maxDiceNumber", {
        name: "DICESONICE.maxDiceNumber",
        hint: "DICESONICE.maxDiceNumberHint",
        scope: "world",
        type: Number,
        default: 20,
        range: {
            min: 20,
            max: 100,
            step: 5
        },
        config: true
    });

    game.settings.register("dice-so-nice", "globalAnimationSpeed", {
        name: "DICESONICE.globalAnimationSpeed",
        hint: "DICESONICE.globalAnimationSpeedHint",
        scope: "world",
        type: String,
        choices: Utils.localize({
            "0": "DICESONICE.PlayerSpeed",
            "1": "DICESONICE.NormalSpeed",
            "2": "DICESONICE.2xSpeed",
            "3": "DICESONICE.3xSpeed"
        }),
        default: "0",
        config: true,
        onChange: () => {
            location.reload();
        }
    });

    game.settings.register("dice-so-nice", "enabledSimultaneousRolls", {
        name: "DICESONICE.enabledSimultaneousRolls",
        hint: "DICESONICE.enabledSimultaneousRollsHint",
        scope: "world",
        type: Boolean,
        default: true,
        config: true,
        onChange: () => {
            location.reload();
        }
    });

    game.settings.register("dice-so-nice", "diceCanBeFlipped", {
        name: "DICESONICE.diceCanBeFlipped",
        hint: "DICESONICE.diceCanBeFlippedHint",
        scope: "world",
        type: Boolean,
        default: true,
        config: true
    });

    game.settings.register("dice-so-nice", "enabled", {
        scope: "world",
        type: Boolean,
        default: true,
        config: false
    });

    game.settings.register("dice-so-nice", "disabledDuringCombat", {
        name: "DICESONICE.disabledDuringCombat",
        hint: "DICESONICE.disabledDuringCombatHint",
        scope: "world",
        type: Boolean,
        default: false,
        config: true
    });

    game.settings.register("dice-so-nice", "immediatelyDisplayChatMessages", {
        name: "DICESONICE.immediatelyDisplayChatMessages",
        hint: "DICESONICE.immediatelyDisplayChatMessagesHint",
        scope: "world",
        type: Boolean,
        default: false,
        config: true
    });

});

/**
 * Foundry is ready, let's create a new Dice3D!
 */
Hooks.once('ready', () => {

    Utils.migrateOldSettings();

    game.dice3d = new Dice3D();
});

/**
 * Intercepts all roll-type messages hiding the content until the animation is finished
 */
Hooks.on('createChatMessage', (chatMessage) => {
    if (!chatMessage.isRoll ||
        !chatMessage.isContentVisible ||
        !game.dice3d ||
        game.dice3d.messageHookDisabled ||
        chatMessage.getFlag("core", "RollTable")) {
        return;
    }

    //Remove the chatmessage sound if it is the core dice sound.
    if (Dice3D.CONFIG.sounds && chatMessage.data.sound == "sounds/dice.wav") {
        mergeObject(chatMessage.data, { "-=sound": null });
    }

    chatMessage._dice3danimating = true;
    game.dice3d.showForRoll(chatMessage.roll, chatMessage.user, false, null, false, chatMessage.id).then(displayed => {
        delete chatMessage._dice3danimating;
        $(`#chat-log .message[data-message-id="${chatMessage.id}"]`).show();
        Hooks.callAll("diceSoNiceRollComplete", chatMessage.id);
        ui.chat.scrollBottom();
    });
});

/**
 * Hide messages which are animating rolls.
 */
Hooks.on("renderChatMessage", (message, html, data) => {
    if (game.dice3d && game.dice3d.messageHookDisabled) {
        return;
    }
    if (message._dice3danimating) {
        html.hide();
    }
});

/**
 * Generic utilities class...
 */
class Utils {

    /**
     * Migrate old 1.0 setting to new 2.0 format.
     */
    static async migrateOldSettings() {
        let settings = game.settings.get("dice-so-nice", "settings");
        if (settings.diceColor || settings.labelColor) {
            let newSettings = mergeObject(Dice3D.DEFAULT_OPTIONS, settings, { insertKeys: false, insertValues: false });
            let appearance = mergeObject(Dice3D.DEFAULT_APPEARANCE(), settings, { insertKeys: false, insertValues: false });
            await game.settings.set('dice-so-nice', 'settings', mergeObject(newSettings, { "-=dimensions": null, "-=fxList": null }));
            await game.user.setFlag("dice-so-nice", "appearance", appearance);
            ui.notifications.info(game.i18n.localize("DICESONICE.migrateMessage"));
        }
    }

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
    static contrastOf(color) {

        if (color.slice(0, 1) === '#') {
            color = color.slice(1);
        }

        if (color.length === 3) {
            color = color.split('').map(function (hex) {
                return hex + hex;
            }).join('');
        }

        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);

        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

        return (yiq >= 128) ? '#000000' : '#FFFFFF';
    };

    static prepareTextureList() {
        return Object.keys(TEXTURELIST).reduce((i18nCfg, key) => {
            i18nCfg[key] = game.i18n.localize(TEXTURELIST[key].name);
            return i18nCfg;
        }, {}
        );
    };

    static prepareColorsetList() {
        let sets = {};
        if (DiceColors.colorsetForced)
            sets[DiceColors.colorsetForced] = COLORSETS[DiceColors.colorsetForced];
        else
            sets = COLORSETS;
        let groupedSetsList = Object.values(sets);
        groupedSetsList.sort((set1, set2) => {
            //if(game.i18n.localize(set1.category) < game.i18n.localize(set2.category)) return -1;
            //if(game.i18n.localize(set1.category) > game.i18n.localize(set2.category)) return 1;

            if (game.i18n.localize(set1.description) < game.i18n.localize(set2.description)) return -1;
            if (game.i18n.localize(set1.description) > game.i18n.localize(set2.description)) return 1;
        });
        let preparedList = {};
        for (let i = 0; i < groupedSetsList.length; i++) {
            let locCategory = game.i18n.localize(groupedSetsList[i].category);
            if (!preparedList.hasOwnProperty(locCategory))
                preparedList[locCategory] = {};

            preparedList[locCategory][groupedSetsList[i].name] = game.i18n.localize(groupedSetsList[i].description);
        }

        return preparedList;
    };

    static prepareSystemList() {
        let systems = game.dice3d.box.dicefactory.systems;
        return Object.keys(systems).reduce((i18nCfg, key) => {
            if (!game.dice3d.box.dicefactory.systemForced || game.dice3d.box.dicefactory.systemActivated == key)
                i18nCfg[key] = game.i18n.localize(systems[key].name);
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
            hideAfterRoll: true,
            timeBeforeHide: 2000,
            hideFX: 'fadeOut',
            autoscale: true,
            scale: 75,
            speed: 1,
            shadowQuality: 'high',
            bumpMapping: true,
            sounds: true,
            soundsSurface: 'felt',
            soundsVolume: 0.5,
            canvasZIndex:'over',
            throwingForce:'medium'
        };
    }

    static DEFAULT_APPEARANCE(user = game.user) {
        return {
            labelColor: Utils.contrastOf(user.color),
            diceColor: user.color,
            outlineColor: user.color,
            edgeColor: user.color,
            texture: "none",
            material: "auto",
            colorset: "custom",
            system: "standard"
        };
    }

    static ALL_DEFAULT_OPTIONS(user = game.user) {
        return mergeObject(Dice3D.DEFAULT_OPTIONS, Dice3D.DEFAULT_APPEARANCE(user));
    }

    static get CONFIG() {
        return mergeObject(Dice3D.DEFAULT_OPTIONS, game.settings.get("dice-so-nice", "settings"));
    }

    static APPEARANCE(user = game.user) {
        let appearance = mergeObject(Dice3D.DEFAULT_APPEARANCE(user), user.getFlag("dice-so-nice", "appearance"));
        return mergeObject(appearance, { "-=dimensions": null });
    }

    static ALL_CONFIG(user = game.user) {
        return mergeObject(Dice3D.CONFIG, Dice3D.APPEARANCE(user));
    }

    /**
     * Register a new system
     * The id is to be used with addDicePreset
     * The name can be a localized string
     * @param {Object} system {id, name}
     * @param {Boolean} forceActivate Will force activate this model. Other models won't be available
     */
    addSystem(system, forceActivate = false) {
        this.box.dicefactory.addSystem(system);
        if (forceActivate)
            this.box.dicefactory.setSystem(system.id, forceActivate);
    }

    /**
     * Register a new dice preset
     * Type should be a known dice type (d4,d6,d8,d10,d12,d20,d100)
     * Labels contains either strings (unicode) or a path to a texture (png, gif, jpg, webp)
     * The texture file size should be 256*256
     * The system should be a system id already registered
     * @param {Object} dice {type:"",labels:[],system:""}
     */
    addDicePreset(dice, shape = null) {
        this.box.dicefactory.addDicePreset(dice, shape);
    }

    /**
     * Add a texture to the list of textures and preload it
     * @param {String} textureID 
     * @param {Object} textureData 
     * @returns {Promise}
     */
    addTexture(textureID, textureData) {
        if (!textureData.bump)
            textureData.bump = '';
        return new Promise((resolve) => {
            let textureEntry = {};
            textureEntry[textureID] = textureData;
            TEXTURELIST[textureID] = textureData;
            DiceColors.loadTextures(textureEntry, (images) => {
                resolve();
            });
        });
    }

    /**
     * Add a colorset (theme)
     * @param {Object} colorset 
     * @param {Object} apply = "no", "default", "force"
     */
    addColorset(colorset, apply = "no") {
        let defaultValues = {
            foreground:"custom",
            background:"custom",
            outline:"custom",
            edge:"custom",
            texture:"custom",
            material:"custom"
        }
        colorset = mergeObject(defaultValues, colorset);
        COLORSETS[colorset.name] = colorset;
        DiceColors.initColorSets(colorset);

        switch (apply) {
            case "force":
                DiceColors.colorsetForced = colorset.name;
            //note: there's no break here on purpose 
            case "default":
                //If there's no apperance already selected by the player, save this custom colorset as his own
                let savedAppearance = game.user.getFlag("dice-so-nice", "appearance");
                if (!savedAppearance) {
                    let appearance = Dice3D.DEFAULT_APPEARANCE();
                    appearance.colorset = colorset.name;
                    game.user.setFlag("dice-so-nice", "appearance", appearance);
                }
        }
    }

    /**
     * Ctor. Create and initialize a new Dice3d.
     */
    constructor() {
        Hooks.call("diceSoNiceInit", this);
        this._buildCanvas();
        this._initListeners();
        this._buildDiceBox();
        DiceColors.loadTextures(TEXTURELIST, (images) => {
            DiceColors.initColorSets();
            Hooks.call("diceSoNiceReady", this);
        });
        this._startQueueHandler();
        this._nextAnimationHandler();
    }

    /**
     * Create and inject the dice box canvas resizing to the window total size.
     *
     * @private
     */
    _buildCanvas() {
        this.canvas = $('<div id="dice-box-canvas" style="position: absolute; left: 0; top: 0;pointer-events: none;"></div>');
        if(Dice3D.CONFIG.canvasZIndex == "over"){
            this.canvas.css("z-index",1000);
            this.canvas.appendTo($('body'));
        } 
        else{
            $("#board").after(this.canvas);
        }
        this.currentCanvasPosition = Dice3D.CONFIG.canvasZIndex;
        this.currentBumpMapping =  Dice3D.CONFIG.bumpMapping;
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
        this.DiceFactory = new DiceFactory();
        let config = Dice3D.ALL_CONFIG();
        config.boxType = "board";
        this.box = new DiceBox(this.canvas[0], this.DiceFactory, config);
        this.box.initialize();
    }

    /**
     * Init listeners on windows resize and on click if auto hide has been disabled within the settings.
     *
     * @private
     */
    _initListeners() {
        this._rtime;
        this._timeout = false;
        $(window).resize(() => {
            this._rtime = new Date();
            if (this._timeout === false) {
                this._timeout = true;
                setTimeout(this._resizeEnd.bind(this), 1000);
            }
        });

        $('body,html').click(() => {
            const config = Dice3D.CONFIG;
            if (!config.hideAfterRoll && this.canvas.is(":visible") && !this.box.rolling) {
                this.canvas.hide();
                this.box.clearAll();
            }
        });
        game.socket.on('module.dice-so-nice', (request) => {
            if (!request.users || request.users.includes(game.user.id)) {
                this.show(request.data, game.users.get(request.user));
            }
        });
    }

    _resizeEnd() {
        if (new Date() - this._rtime < 1000) {
            setTimeout(this._resizeEnd.bind(this), 1000);
        } else {
            this._timeout = false;
            //resize ended probably, lets remake the canvas
            this.canvas[0].remove();
            this._buildCanvas();
            this._resizeCanvas();
            let config = Dice3D.ALL_CONFIG();
            config.boxType = "board";
            this.box = new DiceBox(this.canvas[0], this.DiceFactory, config);
            this.box.initialize();
            this.box.preloadSounds();
        }
    }

    /**
     * Start polling and watching te queue for animation requests.
     * Each request is resolved in sequence.
     *
     * @private
     */
    _startQueueHandler() {
        this.queue = [];
        setInterval(() => {
            if (this.queue.length > 0 && !this.box.rolling) {
                let animate = this.queue.shift();
                animate();
            }
        }, 100);
    }

    /**
     * Check if 3D simulation is enabled from the settings.
     */
    isEnabled() {
        let combatEnabled = (!game.combat || !game.combat.started) || (game.combat && game.combat.started && !game.settings.get("dice-so-nice", "disabledDuringCombat"));
        return Dice3D.CONFIG.enabled && game.settings.get("dice-so-nice", "enabled") && combatEnabled;
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
     * Show the 3D Dice animation for the Roll made by the User.
     *
     * @param roll an instance of Roll class to show 3D dice animation.
     * @param user the user who made the roll (game.user by default).
     * @param synchronize if the animation needs to be synchronized for each players (true/false).
     * @param users list of users or userId who can see the roll, leave it empty if everyone can see.
     * @param blind if the roll is blind for the current user
     * @returns {Promise<boolean>} when resolved true if the animation was displayed, false if not.
     */
    showForRoll(roll, user = game.user, synchronize, users = null, blind, messageID = null) {
        let context = {
            roll:roll,
            user:user,
            users:users,
            blind:blind
        };
        Hooks.callAll("diceSoNiceRollStart", messageID, context);

        let notation = new DiceNotation(context.roll);
        return this.show(notation, context.user, synchronize, context.users, context.blind);
    }

    /**
     * Show the 3D Dice animation based on data configuration made by the User.
     *
     * @param data data containing the dice info.
     * @param user the user who made the roll (game.user by default).
     * @param synchronize
     * @param users list of users or userId who can see the roll, leave it empty if everyone can see.
     * @param blind if the roll is blind for the current user
     * @returns {Promise<boolean>} when resolved true if the animation was displayed, false if not.
     */
    show(data, user = game.user, synchronize = false, users = null, blind) {
        return new Promise((resolve, reject) => {

            if (!data.throws) throw new Error("Roll data should be not null");

            if (!data.throws.length || !this.isEnabled()) {
                resolve(false);
            } else {

                if (synchronize) {
                    users = users && users.length > 0 ? (users[0].id ? users.map(user => user.id) : users) : users;
                    game.socket.emit("module.dice-so-nice", { data: data, user: user.id, users: users });
                }

                if (!blind) {
                    this._showAnimation(data, Dice3D.APPEARANCE(user)).then(displayed => {
                        resolve(displayed);
                    });
                } else {
                    resolve(false);
                }
            }
            if(game.settings.get("dice-so-nice","immediatelyDisplayChatMessages")){
                resolve();
            }
        });
    }

    /**
     *
     * @param formula
     * @param results
     * @param dsnConfig
     * @returns {Promise<boolean>}
     * @private
     */
    _showAnimation(notation, dsnConfig) {
        notation.dsnConfig = dsnConfig;
        return new Promise((resolve, reject) => {
            this.nextAnimation.addItem({
                params : notation,
                resolve : resolve
            });
        });
    }

    _nextAnimationHandler(){
        let timing = game.settings.get("dice-so-nice", "enabledSimultaneousRolls") ? 400:0;
        this.nextAnimation = new Accumulator(timing, (items)=>{
            let commands = DiceNotation.mergeQueuedRollCommands(items);
            if (this.isEnabled() && this.queue.length < 10) {
                let count = commands.length;
                commands.forEach(aThrow => {
                    this.queue.push(() => {
                        this._beforeShow();
                        this.box.start_throw(aThrow, () => {
                            if (!--count) {
                                for(let item of items)
                                    item.resolve(true);
                                this._afterShow();
                            }
                        }
                        );
                    });
                });
            } else {
                for(let item of items)
                    item.resolve(false);
            }
        });
    }

    /**
     *
     * @private
     */
    _beforeShow() {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
        }
        this.canvas.stop(true);
        this.canvas.show();
    }

    /**
     *
     * @private
     */
    _afterShow() {
        if (Dice3D.CONFIG.hideAfterRoll) {
            this.timeoutHandle = setTimeout(() => {
                if (!this.box.rolling) {
                    if (Dice3D.CONFIG.hideFX === 'none') {
                        this.canvas.hide();
                        this.box.clearAll();
                    }
                    if (Dice3D.CONFIG.hideFX === 'fadeOut') {
                       this.canvas.fadeOut({
                            duration: 1000,
                            complete: () => {
                                this.box.clearAll();
                            },
                            fail: () => {
                                this.canvas.fadeIn(0);
                            }
                        });
                    }
                }
            }, Dice3D.CONFIG.timeBeforeHide);
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

class Accumulator {
    constructor (delay, onEnd) {
        this._timeout = null;
        this._delay = delay;
        this._onEnd = onEnd;
        this._items = [];
    }

    addItem (item) {
        this._items.push(item);
        if(this._timeout)
            clearTimeout(this._timeout);
        let callback = function(){
            this._onEnd(this._items)
            this._timeout = null
            this._items = [];
        }.bind(this);
        if(this._delay)
            this._timeout = setTimeout(callback, this._delay);
        else
            callback();
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
            height: 700,
            closeOnSubmit: true
        })
    }

    getData(options) {
        return mergeObject({
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
            materialList: Utils.localize({
                "auto": "DICESONICE.MaterialAuto",
                "plastic": "DICESONICE.MaterialPlastic",
                "metal": "DICESONICE.MaterialMetal",
                "glass": "DICESONICE.MaterialGlass",
                "wood": "DICESONICE.MaterialWood",
                "chrome": "DICESONICE.MaterialChrome"
            }),
            colorsetList: Utils.prepareColorsetList(),
            shadowQualityList: Utils.localize({
                "none": "DICESONICE.None",
                "low": "DICESONICE.Low",
                "high": "DICESONICE.High"
            }),
            systemList: Utils.prepareSystemList(),
            soundsSurfaceList: Utils.localize({
                "felt": "DICESONICE.SurfaceFelt",
                "wood_table": "DICESONICE.SurfaceWoodTable",
                "wood_tray": "DICESONICE.SurfaceWoodTray",
                "metal": "DICESONICE.SurfaceMetal"
            }),
            canvasZIndexList: Utils.localize({
                "over": "DICESONICE.CanvasZIndexOver",
                "under": "DICESONICE.CanvasZIndexUnder",
            }),
            throwingForceList: Utils.localize({
                "weak": "DICESONICE.ThrowingForceWeak",
                "medium": "DICESONICE.ThrowingForceMedium",
                "strong": "DICESONICE.ThrowingForceStrong"
            })
        },
            this.reset ? Dice3D.ALL_DEFAULT_OPTIONS() : Dice3D.ALL_CONFIG()
        );
    }

    activateListeners(html) {
        super.activateListeners(html);

        let canvas = document.getElementById('dice-configuration-canvas');
        let config = mergeObject(
            this.reset ? Dice3D.ALL_DEFAULT_OPTIONS() : Dice3D.ALL_CONFIG(),
            { dimensions: { w: 500, h: 245 }, autoscale: false, scale: 60, boxType:"showcase" }
        );

        this.box = new DiceBox(canvas, game.dice3d.box.dicefactory, config);
        this.box.initialize().then(()=>{
            this.box.showcase(config);

            this.toggleHideAfterRoll();
            this.toggleAutoScale();
            this.toggleCustomColors();

            html.find('input[name="hideAfterRoll"]').change(this.toggleHideAfterRoll.bind(this));
            html.find('input[name="sounds"]').change(this.toggleSounds.bind(this));
            html.find('input[name="autoscale"]').change(this.toggleAutoScale.bind(this));
            html.find('select[name="colorset"]').change(this.toggleCustomColors.bind(this));
            html.find('input,select').change(this.onApply.bind(this));
            html.find('button[name="reset"]').click(this.onReset.bind(this));

            this.reset = false;
        });
    }

    toggleHideAfterRoll() {
        let hideAfterRoll = $('input[name="hideAfterRoll"]')[0].checked;
        $('input[name="timeBeforeHide"]').prop("disabled", !hideAfterRoll);
        $('select[name="hideFX"]').prop("disabled", !hideAfterRoll);
    }

    toggleSounds() {
        let sounds = $('input[name="sounds"]')[0].checked;
        $('select[name="soundsSurface"]').prop("disabled", !sounds);
        $('input[name="soundsVolume"]').prop("disabled", !sounds);
        //$('.sounds-range-value').css({ 'opacity': !sounds ? 0.4 : 1 });
    }

    toggleAutoScale() {
        let autoscale = $('input[name="autoscale"]')[0].checked;
        $('input[name="scale"]').prop("disabled", autoscale);
        //$('.scale-range-value').css({ 'opacity': autoscale ? 0.4 : 1 });
    }

    toggleCustomColors() {
        let colorset = $('select[name="colorset"]').val() !== 'custom';
        $('input[name="labelColor"]').prop("disabled", colorset);
        $('input[name="diceColor"]').prop("disabled", colorset);
        $('input[name="outlineColor"]').prop("disabled", colorset);
        $('input[name="edgeColor"]').prop("disabled", colorset);
        $('input[name="labelColorSelector"]').prop("disabled", colorset);
        $('input[name="diceColorSelector"]').prop("disabled", colorset);
        $('input[name="outlineColorSelector"]').prop("disabled", colorset);
        $('input[name="edgeColorSelector"]').prop("disabled", colorset);
    }

    onApply(event) {
        event.preventDefault();

        setTimeout(() => {

            let config = {
                labelColor: $('input[name="labelColor"]').val(),
                diceColor: $('input[name="diceColor"]').val(),
                outlineColor: $('input[name="outlineColor"]').val(),
                edgeColor: $('input[name="edgeColor"]').val(),
                autoscale: false,
                scale: 60,
                shadowQuality: $('select[name="shadowQuality"]').val(),
                bumpMapping: $('input[name="bumpMapping"]').is(':checked'),
                colorset: $('select[name="colorset"]').val(),
                texture: $('select[name="texture"]').val(),
                material: $('select[name="material"]').val(),
                sounds: $('input[name="sounds"]').is(':checked'),
                system: $('select[name="system"]').val(),
                throwingForce:$('select[name="throwingForce"]').val()
            };

            this.box.update(config);
            this.box.showcase(config);
        }, 100);
    }

    onReset() {
        this.reset = true;
        this.render();
    }

    async _updateObject(event, formData) {
        //Remove custom settings if custom isn't selected to prevent losing them in the user save
        if(formData.colorset != "custom"){
                delete formData.labelColor;
                delete formData.diceColor;
                delete formData.outlineColor;
                delete formData.edgeColor;
        }
        let settings = mergeObject(Dice3D.CONFIG, formData, { insertKeys: false, insertValues: false });
        let appearance = mergeObject(Dice3D.APPEARANCE(), formData, { insertKeys: false, insertValues: false });
        await game.settings.set('dice-so-nice', 'settings', settings);
        await game.user.setFlag("dice-so-nice", "appearance", appearance);
        ui.notifications.info(game.i18n.localize("DICESONICE.saveMessage"));
    }

}