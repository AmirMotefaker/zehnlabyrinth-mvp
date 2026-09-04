extends Node2D
var session := PuzzleSession.new()
var board := PuzzleBoard.new()
var status: Label
var metrics: Label

func _ready() -> void:
	add_child(board); board.configure(session); board.piece_tapped.connect(_on_piece_tapped)
	session.changed.connect(_refresh); session.completed.connect(_on_completed)
	_build_ui(); _refresh()

func _build_ui() -> void:
	var layer := CanvasLayer.new(); add_child(layer)
	var title := Label.new(); title.text="هزارتوی ذهن · شبکهٔ عصبی نور"; title.position=Vector2(80,55); title.add_theme_font_size_override("font_size",42); layer.add_child(title)
	status=Label.new(); status.position=Vector2(80,125); status.size=Vector2(500,115); status.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; status.add_theme_font_size_override("font_size",23); layer.add_child(status)
	metrics=Label.new(); metrics.position=Vector2(80,245); metrics.add_theme_font_size_override("font_size",23); layer.add_child(metrics)
	var pulse:=_button("ارسال پالس",Vector2(620,166)); pulse.pressed.connect(_on_pulse); layer.add_child(pulse)
	var hint:=_button("راهنما −۲۵",Vector2(770,166)); hint.pressed.connect(_on_hint); layer.add_child(hint)
	var reset:=_button("بازنشانی",Vector2(900,166)); reset.pressed.connect(_on_reset); layer.add_child(reset)

func _button(text: String, at: Vector2) -> Button:
	var button:=Button.new(); button.text=text; button.position=at; button.size=Vector2(130,62); button.add_theme_font_size_override("font_size",19); return button
func _on_piece_tapped(index: int) -> void: session.rotate_piece(index)
func _on_pulse() -> void:
	var response:=session.send_pulse(); status.text=response.get("message",_default_status())
func _on_hint() -> void:
	var response:=session.use_hint()
	status.text="یک چرخش درست روشن شد؛ %d امتیاز از پاداش مرحله کم می‌شود." % response.get("cost",0) if response.get("kind")=="piece" else "قطعه‌ها آماده‌اند؛ پالس بعدی را بفرست."
func _on_reset() -> void:
	session=PuzzleSession.new(); board.configure(session); session.changed.connect(_refresh); session.completed.connect(_on_completed); status.text=_default_status(); _refresh()
func _on_completed(reward: int) -> void: status.text="مرحله کامل شد! %d امتیاز گرفتی." % reward
func _refresh() -> void:
	metrics.text="پالس: %d از ۲     حرکت: %d     راهنما: %d     رله‌ها: %d از ۳" % [session.pulse,session.moves,session.hints_used,session.trace().lit_relays.size()]
	if not session.completed and status.text.is_empty(): status.text=_default_status()
func _default_status() -> String: return "پالس اول: رله‌های ۱ و ۲ را روشن کن؛ سپس پالس دوم، رلهٔ ۳ و ستاره را."
