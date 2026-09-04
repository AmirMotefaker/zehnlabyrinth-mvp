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

const BUNDLED_FONT_PATH := "res://assets/fonts/Vazirmatn.ttf"

static var _bundled_font: Font
static var _system_fallback: SystemFont

static func _fallback_font() -> SystemFont:
	if _system_fallback == null:
		_system_fallback = SystemFont.new()
		_system_fallback.font_names = PackedStringArray(["Vazirmatn", "Tahoma", "Noto Sans Arabic", "Noto Sans", "Arial", "sans-serif"])
		_system_fallback.allow_system_fallback = true
	return _system_fallback

static func ui_font(_weight: int = 500) -> Font:
	if _bundled_font == null and ResourceLoader.exists(BUNDLED_FONT_PATH):
		_bundled_font = load(BUNDLED_FONT_PATH) as Font
	if _bundled_font != null:
		return _bundled_font
	return _fallback_font()

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

static func apply_fa_button(button: Button, size: int = 40, accent: bool = false) -> void:
	button.add_theme_font_override("font", ui_font(700 if accent else 500))
	button.add_theme_font_size_override("font_size", size)
	button.add_theme_color_override("font_color", BG if accent else TEXT)
	button.add_theme_color_override("font_hover_color", BG if accent else TEXT)
	button.text_direction = TextServer.DIRECTION_RTL
	button.layout_direction = Control.LAYOUT_DIRECTION_RTL
	button.language = "fa"
	button.custom_minimum_size = Vector2(230, 88)

	var normal := StyleBoxFlat.new()
	normal.bg_color = PRIMARY if accent else SURFACE_CONTROL
	normal.border_color = PRIMARY if accent else BORDER_CONTROL
	normal.set_border_width_all(2)
	normal.set_corner_radius_all(20)
	normal.content_margin_left = 22
	normal.content_margin_right = 22
	normal.content_margin_top = 12
	normal.content_margin_bottom = 12
	button.add_theme_stylebox_override("normal", normal)

	var hover := normal.duplicate()
	hover.bg_color = ENERGY if accent else SURFACE_ACTIVE
	hover.border_color = SUCCESS if accent else PRIMARY
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
