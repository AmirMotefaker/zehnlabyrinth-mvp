extends Node2D

var session := PuzzleSession.new()
var board := PuzzleBoard.new()
var status: Label
var metrics: Label
var subtitle: Label

func _ready() -> void:
	RenderingServer.set_default_clear_color(NeyroTheme.BG)
	add_child(board)
	board.configure(session)
	board.piece_tapped.connect(_on_piece)
	session.changed.connect(_refresh)
	session.stage_completed.connect(_complete)
	_ui()
	_refresh()

func _make_button(text: String, action: Callable, accent: bool = false) -> Button:
	var button := Button.new()
	button.text = text
	NeyroTheme.apply_fa_button(button, 38, accent)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.pressed.connect(action)
	return button

func _ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(root)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_TOP_WIDE)
	margin.offset_left = 58
	margin.offset_top = 34
	margin.offset_right = -58
	margin.offset_bottom = 430
	margin.add_theme_constant_override("margin_left", 0)
	margin.add_theme_constant_override("margin_right", 0)
	root.add_child(margin)

	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 18)
	margin.add_child(stack)

	var title := Label.new()
	title.text = "NEYRO"
	title.add_theme_font_override("font", NeyroTheme.ui_font(800))
	title.add_theme_font_size_override("font_size", 64)
	title.add_theme_color_override("font_color", NeyroTheme.TEXT)
	stack.add_child(title)

	subtitle = Label.new()
	subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	NeyroTheme.apply_fa_label(subtitle, 34, 500)
	subtitle.add_theme_color_override("font_color", NeyroTheme.TEXT_MUTED)
	stack.add_child(subtitle)

	status = Label.new()
	status.custom_minimum_size = Vector2(0, 62)
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	NeyroTheme.apply_fa_label(status, 38, 700)
	stack.add_child(status)

	metrics = Label.new()
	NeyroTheme.apply_fa_label(metrics, 32, 500)
	metrics.add_theme_color_override("font_color", NeyroTheme.TEXT_MUTED)
	stack.add_child(metrics)

	var actions := HBoxContainer.new()
	actions.layout_direction = Control.LAYOUT_DIRECTION_RTL
	actions.add_theme_constant_override("separation", 18)
	actions.add_child(_make_button("◉ ارسال پالس", _pulse, true))
	actions.add_child(_make_button("راهنما −۲۵", _hint))
	actions.add_child(_make_button("مرحله بعد", _next))
	stack.add_child(actions)

func _on_piece(index: int) -> void:
	session.rotate_piece(index)

func _pulse() -> void:
	status.text = session.send_pulse().get("message", "پالس ارسال شد.")

func _hint() -> void:
	var result := session.use_hint()
	if result.get("kind") == "piece":
		status.text = "یک حرکت درست روشن شد؛ %s امتیاز از پاداش مرحله کم می‌شود." % NeyroTheme.to_persian_digits(result.get("cost", 0))
	else:
		status.text = "قطعه‌ها آماده‌اند؛ پالس را بزن."

func _next() -> void:
	session.load_stage(session.age_band, session.difficulty, session.stage + 1)
	status.text = "مرحلهٔ بعدی آماده است."

func _complete(reward: int) -> void:
	status.text = "مرحله کامل شد! %s امتیاز گرفتی." % NeyroTheme.to_persian_digits(reward)

func _refresh() -> void:
	var pulse_total := int(session.profile.pulses)
	subtitle.text = "%s · مرحله %s از ۱۰۰۰ · %s" % [
		session.profile.track_name,
		NeyroTheme.to_persian_digits(session.stage),
		session.profile.track_rules
	]
	metrics.text = "پالس: %s از %s     حرکت: %s     راهنما: %s" % [
		NeyroTheme.to_persian_digits(session.pulse),
		NeyroTheme.to_persian_digits(pulse_total),
		NeyroTheme.to_persian_digits(session.moves),
		NeyroTheme.to_persian_digits(session.hints_used)
	]
