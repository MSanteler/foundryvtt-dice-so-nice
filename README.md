# FoundryVTT - Dice So Nice!

This module for Foundry VTT adds the ability to show a 3D dice simulation when a roll is made.

## Installation

To install, follow these instructions:

1.  Inside Foundry, select the Game Modules tab in the Configuration and Setup menu.
2.  Click the Install Module button and enter the following URL: https://gitlab.com/riccisi/foundryvtt-dice-so-nice/raw/master/module/module.json
3.  Click Install and wait for installation to complete.

Alternatively, use the integrated module manager in Foundry.

## Usage Instructions

There are no particular instructions for use. Once the module is enabled, 3D animation will be displayed each time dice is rolled on foundry.

![Preview](/dice-so-nice.gif?raw=true)

## Configuration

It is possible to configure some aspects of the dice in the foundry game settings:

![Preview](/dice-so-nice-settings.png?raw=true)

- **Enable 3D dices**: Enable the 3D dice display in this browser session.
- **Label Color**: Allows to change the color of the dice label. 
- **Dice Color**: Allows to change the color of the dice.
- **Automatically Hide**: When enabled, the dice disappear automatically after the result is displayed.
- **Millisecs Before Hiding**: time in milliseconds after which the dice disappear automatically.
- **Hide FX**: Effect used during dice hiding (not many, for now)
- **Auto Scale**: When enabled, auto scale the dice dimension based on the display size.
- **Manual Scale**: Allows to manually change the scale of the dice.

## Internal API

Once enabled, 'Dice So Nice' changes the behaviour of the API `Roll.toMessage` method so that a 3D dice animation is 
automatically displayed and resolved
before the result is shown on the chat log.    
This solves the majority of the cases related to the roll visualization when vanilla foundry is used.   
Customized Systems and Modules, however, may implement differently the way the roll is resolved and therefore they may
not use the `toMessage` method or they may not even use the `Roll` class entirely, in favor of custom random strategies for calculating the result.   
In this case, 'Dice so Nice' exposes APIs to trigger the animation and have a notification when finished.
If the Roll class is still used, activating the animation could be done using the `game.dice3d.showForRoll` method:
```javascript
const r = new Roll('1d20');
r.roll();
game.dice3d.showForRoll(r).then(displayed => { /*do you stuff after the animation */  });
```
`game.dice3d.showForRoll` returns a promise that is resolved once the animation has ended. The returned parameter is a boolean that 
informs if the animation took place or not.

Since version 1.3 it is possible to view other player's rolls so, two optionals parameters have been added to the signature:   
```javascript
game.dice3d.showForRoll(r, whisper, blind)
```
where: 
* `whisper`: array containing the ids of other users who can see the roll (typically the DM)
* `blind`: when true the roll is not displayed, unless the id of the user is contained in the whisper array. 

If the `Roll` class is not used, you can alternatively call the `game.dice3d.show` method passing a JSON configuration data like so:

```javascript
const data = {
    formula: 'd20 + 2d6',
    results: [20,6,6]   ,
    whisper: [],
    blind: false
};
game.dice3d.show(data).then(displayed => { /*do you stuff after the animation */  }); 
```
The configuration must contain two parameters:

* **formula**: a string containing the dice to show formatted as `[n of dices if > 0]d[n of faces] [+...n]`, where the 'n of faces' can take only these values: 4,6,8,10,12,20,100. 
* **results** an array containing the ordered list of the roll results. In the example above 20 is the result of the d20, 6 and 6 of the 2d6.  

## Known limitations

- The maximum number of dice displayed simultaneously is equal to 20.
- Works with vanilla foundry and with modules that do not substantially modify the Roll API.

## Compatibility

Tested on 0.5.5 version.

## Acknowledgment

Based on the "Online 3D dice roller" from [http://a.teall.info/dice](http://www.teall.info/2014/01/online-3d-dice-roller.html). 
Credits go to Anton Natarov, who published it under public domain.

> "You can assume that it has the MIT license (or that else) if you wish so. I do not love any licenses at all and prefer to simply say that it is completely free =)" - Anton Natarov

## Feedback

Every suggestions/feedback are appreciated, if so, please contact me on discord (Simone#6710)

## License

FoundryVTT Dice So Nice is a module for Foundry VTT by Simone and is licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development v 0.1.6](http://foundryvtt.com/pages/license.html).