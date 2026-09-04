class_name PuzzleBoard
extends Node2D
signal piece_tapped(index: int)
const ORIGIN := Vector2(190, 520)
const STEP := 140.0
const TILE_SIZE := 96.0
var session: PuzzleSession

func configure(value: PuzzleSession) -> void:
	session = value
	session.changed.connect(queue_redraw)
	queue_redraw()

func center(cell: Vector2i) -> Vector2:
	return ORIGIN + Vector2(cell.x * STEP, cell.y * STEP)

func _draw() -> void:
	if session == null: return
	draw_rect(Rect2(Vector2(50,320), Vector2(980,780)), Color("121b41"), true)
	var result := session.trace()
	for segment in result.segments:
		draw_line(center(Vector2i(segment[0])), center(Vector2i(segment[1])), Color("5de9e2"), 16.0, true)
	var font := ThemeDB.fallback_font
	for blocker in session.level.blockers:
		var rect := Rect2(center(blocker)-Vector2.ONE*TILE_SIZE*.5, Vector2.ONE*TILE_SIZE)
		draw_rect(rect, Color("252a44"), true); draw_rect(rect, Color("66729b"), false, 4.0)
		draw_string(font, rect.position+Vector2(35,64), "×", HORIZONTAL_ALIGNMENT_CENTER, 28, 42, Color("a9b7ea"))
	for relay_index in range(session.level.relays.size()):
		var relay: Vector2i = session.level.relays[relay_index]
		var lit: bool = result.lit_relays.has(relay_index)
		draw_circle(center(relay),35,Color("6a5728") if lit else Color("2d2437"))
		draw_arc(center(relay),35,0,TAU,36,Color("ffe582") if lit else Color("ffb55c"),5,true)
		draw_string(font,center(relay)+Vector2(-10,11),str(relay_index+1),HORIZONTAL_ALIGNMENT_CENTER,20,28,Color.WHITE)
	for index in range(session.level.pieces.size()):
		var piece: Dictionary = session.level.pieces[index]
		var active := result.hit_pieces.has(index)
		var edge := Color("ffb55c") if session.last_hint == index else (Color("ffe582") if active else Color("6377af"))
		var rect := Rect2(center(piece.cell)-Vector2.ONE*TILE_SIZE*.5, Vector2.ONE*TILE_SIZE)
		draw_rect(rect,Color("5d5331") if active else Color("263670"),true); draw_rect(rect,edge,false,4)
		var glyph := "—" if piece.kind == "rail" and session.orientations[index] == 0 else ("│" if piece.kind == "rail" else ("╱" if session.orientations[index] == 0 else "╲"))
		draw_string(font,rect.position+Vector2(20,62),glyph,HORIZONTAL_ALIGNMENT_CENTER,56,48,Color.WHITE)
	_draw_node(session.level.start,"آغاز",Color("58e3dd"))
	_draw_node(session.level.goal,"ستاره",Color("ffe582") if session.completed else Color("9278ff"))

func _draw_node(cell: Vector2i, text: String, color: Color) -> void:
	var font := ThemeDB.fallback_font
	draw_circle(center(cell),48,Color("14234c")); draw_arc(center(cell),48,0,TAU,48,color,6,true)
	draw_string(font,center(cell)+Vector2(-31,8),text,HORIZONTAL_ALIGNMENT_CENTER,62,20,color)

func _unhandled_input(event: InputEvent) -> void:
	if session == null or not (event is InputEventMouseButton and event.pressed): return
	for index in range(session.level.pieces.size()):
		var cell: Vector2i = session.level.pieces[index].cell
		if Rect2(center(cell)-Vector2.ONE*TILE_SIZE*.5,Vector2.ONE*TILE_SIZE).has_point(event.position):
			piece_tapped.emit(index); get_viewport().set_input_as_handled(); return
