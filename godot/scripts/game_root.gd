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

func _button(parent: Node, text: String, pos: Vector2, action: Callable, accent: bool = false) -> void:
	var button := Button.new()
	button.text = text
	button.position = pos
	button.size = Vector2(170, 66)
	NeyroTheme.apply_fa_button(button, 20, accent)
	button.pressed.connect(action)
	parent.add_child(button)

func _ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	var title := Label.new()
	title.text = "NEYRO"
	title.position = Vector2(70, 38)
	title.size = Vector2(430, 62)
	title.add_theme_font_override("font", NeyroTheme.ui_font(800))
	title.add_theme_font_size_override("font_size", 48)
	title.add_theme_color_override("font_color", NeyroTheme.TEXT)
	layer.add_child(title)

	subtitle = Label.new()
	subtitle.position = Vector2(70, 100)
	subtitle.size = Vector2(760, 48)
	NeyroTheme.apply_fa_label(subtitle, 20, 500)
	subtitle.add_theme_color_override("font_color", NeyroTheme.TEXT_MUTED)
	layer.add_child(subtitle)

	status = Label.new()
	status.position = Vector2(70, 158)
	status.size = Vector2(430, 110)
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	NeyroTheme.apply_fa_label(status, 23, 700)
	layer.add_child(status)

	metrics = Label.new()
	metrics.position = Vector2(70, 278)
	metrics.size = Vector2(620, 54)
	NeyroTheme.apply_fa_label(metrics, 21, 500)
	metrics.add_theme_color_override("font_color", NeyroTheme.TEXT_MUTED)
	layer.add_child(metrics)

	_button(layer, "مرحله بعد", Vector2(530, 170), _next)
	_button(layer, "راهنما −۲۵", Vector2(715, 170), _hint)
	_button(layer, "◉ ارسال پالس", Vector2(900, 170), _pulse, true)

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
