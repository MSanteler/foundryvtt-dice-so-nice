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

## Known limitations

- Rolls made by the other players are not displayed (with 3D dices)
- The maximum number of dice displayed simultaneously is equal to 20.
- Works with vanilla foundry and with modules that do not substantially modify the Roll API.

## Compatibility

Tested on 0.5.5 version.

## Acknowledgment

Based on the "Online 3D dice roller" from [http://a.teall.info/dice](http://www.teall.info/2014/01/online-3d-dice-roller.htm). 
Credits go to Anton Natarov, who published it under public domain.

> "You can assume that it has the MIT license (or that else) if you wish so. I do not love any licenses at all and prefer to simply say that it is completely free =)" - Anton Natarov

## Feedback

Every suggestions/feedback are appreciated, if so, please contact me on discord (Simone#6710)

## License

FoundryVTT Dice So Nice is a module for Foundry VTT by Simone and is licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development v 0.1.6](http://foundryvtt.com/pages/license.html).