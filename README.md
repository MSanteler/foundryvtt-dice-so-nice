# FoundryVTT - Dice So Nice!

> **If you are using FVTT v0.7.x, please checkout our alpha release of Dice So Nice v3!  
> https://gitlab.com/riccisi/foundryvtt-dice-so-nice/raw/alpha/module/module.json**



This module for Foundry VTT adds the ability to show a 3D dice simulation when a roll is made.

[[_TOC_]]

# Installation

To install, follow these instructions:

1.  Inside Foundry, select the Game Modules tab in the Configuration and Setup menu.
2.  Click the Install Module button and enter the following URL: https://gitlab.com/riccisi/foundryvtt-dice-so-nice/raw/master/module/module.json
3.  Click Install and wait for installation to complete.

Alternatively, use the integrated module manager in Foundry.

# Usage Instructions

There are no particular instructions for use. Once the module is enabled, 3D animation will be displayed each time dice is rolled on foundry.

![Preview](/dice-so-nice.gif?raw=true)

# Configuration

It is possible to configure some aspects of the dice in the foundry game settings:

![Preview](/dice-so-nice-settings.jpg?raw=true)

- **Enable 3D dices**: Enable the 3D dice display in this browser session.
- **Dice Presets (Faces)**: Allows to select the dices faces. Default is "Standard" where every face is a text label. Some game systems can force this value for all players to display their own dices.
- **Theme**: Allows to select a color theme for your dices. Themes changes every color settings and can pack multiple colors that will be selected at random each time you roll. A theme can also include a default texture that will be displayed if you selected "None / Auto (Theme)" in the "Texture" dropdown.
- **Label Color**: Allows to change the color of the dices label. 
- **Dice Color**: Allows to change the color of the dices.
- **Outline Color**: Allows to change the color of the dices label outline.
- **Edge Color**: Allows to change the color of the edges of the dices.
- **Texture**: Allows to select a texture for the dices. Selecting "None / Auto (Theme)" will show the theme texture if there is one.
- **Automatically Hide**: When enabled, the dice disappear automatically after the result is displayed.
- **Millisecs Before Hiding**: time in milliseconds after which the dice disappear automatically.
- **Hide FX**: Effect used during dice hiding (not many, for now)
- **Sound Effects**: When enabled, custom sounds with "realistic" collision effects are played when the dices roll.
- **Auto Scale**: When enabled, auto scale the dices dimension based on the display size.
- **Manual Scale**: Allows to manually change the scale of the dice.
- **Shadows Quality**: Allows to select the shadows quality. Can help with performances on some PCs.
- **Advanced lighting**: When enabled, adds depths to labels and custom textures (Bump Map). Disable for improved performances.
- **Animation Speed**: Change the speed at which the dices roll.
# API
## Hooks
There are various hooks called by 'Dice So Nice' to help you integrate it in your own system/module.
### diceSoNiceReady
Called once the module is ready to listen to new rolls and display 3D animations.  
* `dice3d`: Main class, instantiated and ready to use.
```javascript
Hooks.once('diceSoNiceReady', (dice3d) => {
    //...
});
```
### diceSoNiceInit
Called at the start of the module initialization process.
* `dice3d`: Main class, instantiated but not ready yet.
```javascript
Hooks.once('diceSoNiceInit', (dice3d) => {
    //...
});
```
### diceSoNiceRollStart
Called only when a roll starts from the hook of the Chat message. This hook is not called by using the Roll API.
* `messageId`: ID of the message that triggered the roll.
```javascript
Hooks.on('diceSoNiceRollStart', (messageId) => {
    //...
});
```
### diceSoNiceRollComplete
Called only when a roll complete after being caught in a Chat message. This hook is therefor not called by using the Roll API. If you need to detect when a Roll is complete while using the Roll class, you can wait for the Promise to resolve.
* `messageId`: ID of the message that triggered the roll.
```javascript
Hooks.on('diceSoNiceRollComplete', (messageId) => {
    //...
});
```

## Roll API
Once enabled, 'Dice So Nice' listen to any new ROLL messages rendered in a player Chat log. When it detects one, 'Dice So Nice'  hide the Chat message and display a 3D animation with the roll information available in the Chat message.
This solves the majority of the cases related to the roll visualization when vanilla foundry is used. 

Customized Systems and Modules, however, may implement differently the way the roll is resolved and therefore they may
not want to rely on a single Chat message being rendered or they may not even use the `Roll` class entirely, in favor of custom random strategies for calculating the result.  

In this case, 'Dice so Nice' exposes APIs to trigger the animation and have a notification when finished.
If the Roll class is still used, activating the animation could be done using the `game.dice3d.showForRoll` method:
```javascript
const r = new Roll('1d20');
r.roll();
game.dice3d.showForRoll(r).then(displayed => { /* do you stuff after the animation */  });
```
`game.dice3d.showForRoll` returns a promise that is resolved once the animation has ended. The returned parameter is a boolean that 
informs if the animation took place or not.

Since version 2.0, the function can take extra parameters to synchronize the rolls with other players, see the 2.0 API break part below for the details.

If the `Roll` class is not used, you can alternatively call the `game.dice3d.show` method passing a JSON configuration data like so:

```javascript
const data = {
    formula: 'd20 + 2d6',
    results: [20,6,6]   ,
    whisper: null,
    blind: false
};
game.dice3d.show(data).then(displayed => { /* do your stuff after the animation */  }); 
```
The configuration must contain two parameters:

* **formula**: a string containing the dice to show formatted as `[n of dices if > 0]d[n of faces] [+...n]`, where the 'n of faces' can take only these values: 4,6,8,10,12,20,100. 
* **results** an array containing the ordered list of the roll results. In the example above 20 is the result of the d20, 6 and 6 of the 2d6.  

### 2.0 API break! 
Since version 2.0, the signature of the method ``showForRoll`` and ``show`` have undergone a slightly change to support the new features, below the new signatures: 

```javascript
/**
 * Show the 3D Dice animation for the Roll made by the User.
 *
 * @param roll an instance of Roll class to show 3D dice animation.
 * @param user the user who made the roll (game.user by default).
 * @param synchronize if the animation needs to be synchronized for each players (true/false by default).
 * @param whisper list of users or userId who can see the roll, leave it empty if everyone can see.
 * @param blind if the roll is blind for the current user
 * @returns {Promise<boolean>} when resolved true if the animation was displayed, false if not.
 */
game.dice3d.showForRoll(roll, user, synchronize, whisper, blind)
```   

```javascript
/**
 * Show the 3D Dice animation based on data configuration made by the User.
 *
 * @param data data containing the formula and the result to show in the 3D animation.
 * @param user the user who made the roll (game.user by default).
 * @param synchronize if the animation needs to be synchronized for each players (true/false by default).
 * @param whisper list of users or userId who can see the roll, leave it empty if everyone can see.
 * @param blind if the roll is blind for the current user
 * @returns {Promise<boolean>} when resolved true if the animation was displayed, false if not.
 */
game.dice3d.show(data, user, synchronize, whisper, blind)
```
## Customization API
'Dice So Nice' expose an API for systems and modules to add their own customizations.

#### What is customizable
- **Colors**: Single color or an array of colors to use at random for every supported elements: background, label, outline and edges.
- **Background texture**: A single texture file for every dices with a defined blending mode
- **Faces**: Each dices can have custom faces. A face can be a string or an image file. The font can be changed and any Unicode character is supported (even symbols like emojis 🤩)

#### What is not supported yet
- **Per dice color/texture**: For now, you can't link a single dice type to a specific color or texture.

### Listening to DiceSoNiceReady hook
Before using the customization API, you must make sure that "Dice So Nice" is ready. Please refer to the "Hooks" section.

### Adding a custom system (dice presets list)
A system (or "Dice Presets" for players) allows you to store a list of custom dices
```javascript
/**
 * Register a new system
 * The id is to be used with addDicePreset method
 * The name can be a localized string
 * @param {Object} system {id, name}
 * @param {Boolean} forceActivate Will force the activation of this system for all players. 
 * Other systems won't be available if you do so
 */
dice3d.addSystem({id: "13A", name: "13th Age"}, true);
```
### Adding a custom DicePreset (dice faces)
A custom DicePreset will override a default dice type when its system is selected in the "Dice So Nice" settings.
```javascript
/**
 * Register a new dice preset
 * Type should be a known dice type (d4,d6,d8,d10,d12,d20,d100)
 * Labels contains either strings (unicode) or a path to a texture (png, gif, jpg, webp)
 * The texture file size should be 256*256
 * The system should be a system id already registered
 * (Optional) The font is the name of the font family. (ex: Arial, monospace, etc)
 * (Optional) BumpMaps il an array of bumpmap textures that should follow the exact same order than labels
 * @param {Object} dice {type:"",labels:[],system:"",font:"",bumpMaps:[]}
 */
dice3d.addDicePreset({
    type: "d20",
    labels: [
      "1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19",
      "systems/archmage/images/nat20.png"
    ],
    bumpMaps: [,,,,,,,,,,,,,,,,,,,
      "systems/archmage/images/nat20_BUMP.png"
    ],
    system: "13A"
  });
```
### Adding a custom texture
A background texture is displayed on every face of a dice on top of the dice color.
You can use any blending mode supported by HTMLCanvas2D (Full list: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Compositing/Example)  
```javascript
/**
 * Add a texture to the list of textures and preload it
 * @param {String} textureID 
 * @param {Object} textureData 
 * @returns {Promise}
 */
dice3d.addTexture("13Ared", {
    name: "13th Age Red",
    composite: "source-over",
    source: "systems/archmage/images/redTexture.png"
});
```
### Adding a custom colorset (theme)
```javascript

/**
 * Add a colorset (theme)
 * name: String ID
 * description: Localized string for settings
 * category: Used to group the colorsets in the settings
 * foreground: Colors of the labels
 * background: Colors of the dice
 * outline: Colors of the label outline. Can be 'none'.
 * (Optional) edge: Colors of the edges
 * texture: ID of the texture to use if "None / Auto (Theme)" is selected in the settings. 
 * If it is a custom texture, make sure to call this function after the Promise from "addTexture" is resolved.
 * The "apply" parameter have 3 modes :
 * - "no" just register the colorset. 
 * - "default" apply the colorset if the player didn't already change his dices appearance for this world. 
 * - "force" apply the colorset and the player can't change the colors himself
 * @param {Object} colorset 
 * @param {String} apply = "no" (default)|"default"|"force"
 */
dice3d.addColorset({
    name: '13a',
    description: "13th Age Red/Gold",
    category: "13th Age",
    foreground: '#9F8003',
    background: "#9F8",
    texture: '13Ared',
    edge: '#9F8003'
},"default");

dice3d.addColorset({
    name: 'rainbow',
    description: 'Rainbow',
    category: 'Colors',
    foreground: ['#FF5959','#FFA74F','#FFFF56','#59FF59','#2374FF','#00FFFF','#FF59FF'],
    background: ['#900000','#CE3900','#BCBC00','#00B500','#00008E','#008282','#A500A5'],
    outline: 'black',
    texture: 'none'
});
```
### Full examples
#### 13th Age
Adds a custom texture and replace the "20" on the d20 with 13th Age logo.
```javascript
Hooks.on('diceSoNiceReady', (dice3d) => {
  dice3d.addSystem({id: "13A", name: "13th Age"}, true);

  dice3d.addDicePreset({
    type: "d20",
    labels: [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "systems/archmage/images/nat20.png"
    ],
    system: "13A"
  });

  dice3d.addTexture("13Ared", {
    name: "13th Age Red",
    composite: "source-over",
    source: "systems/archmage/images/redTexture.png"
  })
  .then(() => {
      dice3d.addColorset({
        name: '13a',
        description: "13th Age Red/Gold",
        category: "13th Age",
        background: ["#9F8"],
        texture: '13Ared',
        edge: '#9F8003',
        foreground: '#9F8003',
        default: true
      });
  });
});
```
#### Degenesis
Replace the d6 by a fully custom dice
```javascript
Hooks.once('diceSoNiceReady', (dice3d) => {
  dice3d.addSystem({id:"degenesis",name:"DEGENESIS: Rebirth"},true);
  dice3d.addDicePreset({
    type:"d6",
    labels:[
      'systems/degenesis/icons/dice-faces/d1.png', 
      'systems/degenesis/icons/dice-faces/d2.png', 
      'systems/degenesis/icons/dice-faces/d3.png', 
      'systems/degenesis/icons/dice-faces/d4.png', 
      'systems/degenesis/icons/dice-faces/d5.png', 
      'systems/degenesis/icons/dice-faces/d6.png'
    ],
    system:"degenesis"
  });

  dice3d.addColorset({
    name: 'degenesis',
    description: 'Degenesis Black',
    category: 'Colors',
    foreground: "#FFFFFF",
    background: "#000000",
    outline: 'none',
    texture: 'none'
  },"force");
});
```
# Known limitations

- Works with vanilla foundry and with modules that do not substantially modify the Roll API.

# Compatibility

Tested on 0.6.2 version.

# Acknowledgment

Based on the "Online 3D dice roller" from [http://a.teall.info/dice](http://www.teall.info/2014/01/online-3d-dice-roller.html). 
Credits go to Anton Natarov, who published it under public domain.

> "You can assume that it has the MIT license (or that else) if you wish so. I do not love any licenses at all and prefer to simply say that it is completely free =)" - Anton Natarov

V2 of "Dice So Nice" based on Teal's fork from the awesome MajorVictory, with his direct consent. You can find his online roller here: http://dnd.majorsplace.com/dice/

D10 Geometry created by Greewi who did all the maths for this custom "Pentagonal Trapezohedron". You can find his homebrewed (french) TTRPG Feerie/Solaires here: https://feerie.net/

# Feedback

Every suggestions/feedback are appreciated, if so, please contact (Simone#6710) or JDW (JDW#6422) me on discord 

# License

FoundryVTT Dice So Nice is a module for Foundry VTT by Simone and JDW and is licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development v 0.1.6](http://foundryvtt.com/pages/license.html).