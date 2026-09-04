class_name NeyroTheme
extends RefCounted

const BG := Color("080d24")
const SURFACE := Color("121b41")
const SURFACE_RAISED := Color("182553")
const SURFACE_CONTROL := Color("151e48")
const SURFACE_ACTIVE := Color("263670")
const BORDER := Color("43568f")
const BORDER_CONTROL := Color("4a5d9d")
const TEXT := Color("eff4ff")
const TEXT_MUTED := Color("b9c9ef")
const PRIMARY := Color("58e3dd")
const ENERGY := Color("6feae4")
const ENERGY_GLOW := Color(0.36, 0.92, 0.89, 0.16)
const ACCENT := Color("9278ff")
const WARNING := Color("ffb55c")
const SUCCESS := Color("ffe582")
const ACTIVE_FILL := Color("5d5331")
const NODE_FILL := Color("14234c")
const NODE_ACTIVE_FILL := Color("65572d")
const BLOCKER_FILL := Color("252a44")
const BLOCKER_BORDER := Color("66729b")

static var _regular_font: SystemFont
static var _bold_font: SystemFont

static func _make_font(weight: int) -> SystemFont:
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Vazirmatn", "Tahoma", "Noto Sans Arabic", "Noto Sans", "Arial", "sans-serif"])
	font.allow_system_fallback = true
	font.font_weight = weight
	return font

static func ui_font(weight: int = 500) -> Font:
	if weight >= 700:
		if _bold_font == null:
			_bold_font = _make_font(800)
		return _bold_font
	if _regular_font == null:
		_regular_font = _make_font(500)
	return _regular_font

static func to_persian_digits(value: Variant) -> String:
	var text := str(value)
	var latin := "0123456789"
	var persian := "۰۱۲۳۴۵۶۷۸۹"
	for index in range(10):
		text = text.replace(latin[index], persian[index])
	return text

static func apply_fa_label(label: Label, size: int, weight: int = 500) -> void:
	label.add_theme_font_override("font", ui_font(weight))
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", TEXT)
	label.text_direction = TextServer.DIRECTION_RTL
	label.layout_direction = Control.LAYOUT_DIRECTION_RTL
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	label.language = "fa"

static func apply_fa_button(button: Button, size: int = 20, accent: bool = false) -> void:
	button.add_theme_font_override("font", ui_font(700 if accent else 500))
	button.add_theme_font_size_override("font_size", size)
	button.add_theme_color_override("font_color", BG if accent else TEXT)
	button.add_theme_color_override("font_hover_color", BG if accent else TEXT)
	button.text_direction = TextServer.DIRECTION_RTL
	button.layout_direction = Control.LAYOUT_DIRECTION_RTL
	button.language = "fa"

	var normal := StyleBoxFlat.new()
	normal.bg_color = PRIMARY if accent else SURFACE_CONTROL
	normal.border_color = PRIMARY if accent else BORDER_CONTROL
	normal.set_border_width_all(2)
	normal.set_corner_radius_all(16)
	button.add_theme_stylebox_override("normal", normal)

	var hover := normal.duplicate()
	hover.bg_color = ENERGY if accent else SURFACE_ACTIVE
	hover.border_color = SUCCESS if accent else PRIMARY
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
