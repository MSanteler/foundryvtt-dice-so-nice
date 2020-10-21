# Foundry VTT - Dice So Nice!

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
- **Texture**: Allows to select a texture for the dices. Selecting "None / Auto (Theme)" will show the theme texture if there is one.
- **Material**: Allows to select a material for the dices. Selecting "Auto (Theme)" will show the theme material if there is one. Default is "plastic".
- **Label Color**: Allows to change the color of the dices label. 
- **Dice Color**: Allows to change the color of the dices.
- **Outline Color**: Allows to change the color of the dices label outline.
- **Edge Color**: Allows to change the color of the edges of the dices.
- **Automatically Hide**: When enabled, the dice disappear automatically after the result is displayed.
- **Millisecs Before Hiding**: time in milliseconds after which the dice disappear automatically.
- **Hide FX**: Effect used during dice hiding
- **Sound Effects**: When enabled, custom sounds with "realistic" collision effects are played when the dices roll.
- **Sound Volume**: Let you change the dice sound effect volume. This setting is applied on top of the "Interface" volume bar.
- **Table surface for sounds**: Allows to select the type of sound made by dice hitting the virtual table.
- **Auto Scale**: When enabled, auto scale the dices dimension based on the display size.
- **Manual Scale**: Allows to manually change the scale of the dice.
- **Animation Speed**: Change the speed at which the dices roll.
- **3D layer position**: Select if dice appear on top of the UI or under.
- **Throwing force**: Change the magnitude of the vector applied to roll the dice. Let you either gently roll the dice or throw them with full force like a mad man.
- **Shadows Quality**: Allows to select the shadows quality. Can help with performances on some PCs.
- **Advanced lighting**: When enabled, use realistic lighting (HDRI). Disable for better performances.
# Documentation and API
A complete API and documentation for developers and artists alike is available in the [Wiki](https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/wikis/home)

# Known limitations

- Works with vanilla foundry and with modules that do not substantially modify the Roll API.

# Compatibility

Tested on FVTT 0.7.3

# Acknowledgment

Based on the "Online 3D dice roller" from [http://a.teall.info/dice](http://www.teall.info/2014/01/online-3d-dice-roller.html). 
Credits go to Anton Natarov, who published it under public domain.

> "You can assume that it has the MIT license (or that else) if you wish so. I do not love any licenses at all and prefer to simply say that it is completely free =)" - Anton Natarov

v2 of "Dice So Nice" based on Teal's fork from the awesome MajorVictory, with his direct consent. You can find his online roller here: http://dnd.majorsplace.com/dice/

v10 Geometry created by Greewi who did all the maths for this custom "Pentagonal Trapezohedron". You can find his homebrewed (french) TTRPG Feerie/Solaires here: https://feerie.net

## Theme and model credits:
- **Spencer Thayer:** `Thylean Bronze` theme
- **Foundry VTT:** For the FVTT Logo in the `Foundry VTT` preset.
- **MajorVictory:** For all the other theme in this module!
- **[Joost Vanhoutte](https://joost3d.com/hdris/):** For the "Foyer" HDRI map

Many thanks to the people who continue to support us on Discord, to the amazing system and module developers who integrate our module and to the artists who have let us integrate their textures in Dice So Nice!

# Feedback

Every suggestions/feedback are appreciated, if so, please contact (Simone#6710) or JDW (JDW#6422) on discord 

To report a bug, please open a new issue [in our tracker](https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/issues)

# License

FoundryVTT Dice So Nice is a module for Foundry VTT by Simone and JDW and is licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development](https://foundryvtt.com/article/license/).