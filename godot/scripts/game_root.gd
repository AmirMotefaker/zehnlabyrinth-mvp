extends Node2D
var session:=PuzzleSession.new()
var board:=PuzzleBoard.new()
var status:Label
var metrics:Label
var subtitle:Label
func _ready()->void:
	add_child(board);board.configure(session);board.piece_tapped.connect(_on_piece)
	session.changed.connect(_refresh);session.stage_completed.connect(_complete);_ui();_refresh()
func _button(parent:Node,text:String,pos:Vector2,action:Callable,accent:bool=false)->void:
	var b:=Button.new();b.text=text;b.position=pos;b.size=Vector2(150,66);b.add_theme_font_size_override("font_size",20)
	if accent:b.modulate=Color("8dfcf0")
	b.pressed.connect(action);parent.add_child(b)
func _ui()->void:
	var layer:=CanvasLayer.new();add_child(layer)
	var title:=Label.new();title.text="NEYRO";title.position=Vector2(70,38);title.add_theme_font_size_override("font_size",48);layer.add_child(title)
	subtitle=Label.new();subtitle.position=Vector2(74,96);subtitle.size=Vector2(760,40);subtitle.add_theme_font_size_override("font_size",20);subtitle.modulate=Color("b9c9ef");layer.add_child(subtitle)
	status=Label.new();status.position=Vector2(70,155);status.size=Vector2(500,118);status.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;status.add_theme_font_size_override("font_size",23);layer.add_child(status)
	metrics=Label.new();metrics.position=Vector2(70,278);metrics.add_theme_font_size_override("font_size",21);layer.add_child(metrics)
	_button(layer,"◉ ارسال پالس",Vector2(590,170),_pulse,true)
	_button(layer,"راهنما −۲۵",Vector2(755,170),_hint)
	_button(layer,"مرحله بعد",Vector2(920,170),_next)
func _on_piece(i:int)->void:session.rotate_piece(i)
func _pulse()->void:status.text=session.send_pulse().get("message","پالس ارسال شد.")
func _hint()->void:
	var r:=session.use_hint();status.text="یک حرکت درست روشن شد؛ %d امتیاز از پاداش مرحله کم می‌شود."%r.get("cost",0) if r.get("kind")=="piece" else "قطعه‌ها آماده‌اند؛ پالس را بزن."
func _next()->void:session.load_stage(session.age_band,session.difficulty,session.stage+1);status.text="مرحلهٔ بعدی آماده است."
func _complete(reward:int)->void:status.text="مرحله کامل شد! %d امتیاز گرفتی."%reward
func _refresh()->void:
	var pulse_total:=int(session.profile.pulses)
	subtitle.text="%s · مرحله %d از ۱۰۰۰ · %s"%[session.profile.track_name,session.stage,session.profile.track_rules]
	metrics.text="پالس: %d از %d     حرکت: %d     راهنما: %d"%[session.pulse,pulse_total,session.moves,session.hints_used]
