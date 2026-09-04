# Godot font assets

The Web/Android/iOS export pipeline downloads **Vazirmatn 33.003** from the Google Fonts repository at pinned commit `6f9713a50c628d79f60259319d05fa0a239a9a7f` before Godot import/export.

Runtime path: `res://assets/fonts/Vazirmatn.ttf`

License: SIL Open Font License 1.1 (`OFL.txt` is downloaded beside the font during CI/export).

The binary font is generated into the build workspace rather than committed here. This keeps the repository text-first while guaranteeing that Godot Web does not depend on `SystemFont`, which is not reliable for the browser export.
