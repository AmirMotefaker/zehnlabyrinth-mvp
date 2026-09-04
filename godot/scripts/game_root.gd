extends Node2D
var session:=PuzzleSession.new()
var board:=PuzzleBoard.new()
var status:Label
var metrics:Label
func _ready()->void:
	add_child(board);board.configure(session);board.piece_tapped.connect(_on_piece)
	session.changed.connect(_refresh);session.completed.connect(_complete);_ui();_refresh()
func _ui()->void:
	var layer:=CanvasLayer.new();add_child(layer)
	var title:=Label.new();title.text="NEYRO · شبکهٔ عصبی نور";title.position=Vector2(80,55);title.add_theme_font_size_override("font_size",42);layer.add_child(title)
	status=Label.new();status.position=Vector2(80,125);status.size=Vector2(500,115);status.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;status.add_theme_font_size_override("font_size",23);layer.add_child(status)
	metrics=Label.new();metrics.position=Vector2(80,245);metrics.add_theme_font_size_override("font_size",23);layer.add_child(metrics)
	for item in [["ارسال پالس",620,_pulse],["راهنما −۲۵",770,_hint],["مرحله بعد",900,_next]]:
		var b:=Button.new();b.text=item[0];b.position=Vector2(item[1],166);b.size=Vector2(130,62);b.add_theme_font_size_override("font_size",19);b.pressed.connect(item[2]);layer.add_child(b)
func _on_piece(i:int)->void:session.rotate_piece(i)
func _pulse()->void:status.text=session.send_pulse().get("message","پالس ارسال شد.")
func _hint()->void:
	var r:=session.use_hint();status.text="یک حرکت درست روشن شد؛ %d امتیاز از پاداش مرحله کم می‌شود."%r.get("cost",0) if r.get("kind")=="piece" else "قطعه‌ها آماده‌اند؛ پالس را بزن."
func _next()->void:session.load_stage(session.age_band,session.difficulty,session.stage+1);status.text="مرحلهٔ بعدی آماده است."
func _complete(reward:int)->void:status.text="مرحله کامل شد! %d امتیاز گرفتی."%reward
func _refresh()->void:
	metrics.text="مرحله: %d از ۱۰۰۰     پالس: %d از ۲     حرکت: %d     راهنما: %d"%[session.stage,session.pulse,session.moves,session.hints_used]
