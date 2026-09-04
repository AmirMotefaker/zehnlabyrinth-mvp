class_name PuzzleBoard
extends Node2D

signal piece_tapped(index: int)

var session: PuzzleSession
var layout := BoardLayout.new()
var previous_viewport_size := Vector2.ZERO
var ui_font: Font = NeyroTheme.ui_font()

func configure(value: PuzzleSession) -> void:
	session = value
	session.changed.connect(queue_redraw)
	queue_redraw()

func _process(_delta: float) -> void:
	var viewport_size := get_viewport_rect().size
	if viewport_size != previous_viewport_size:
		previous_viewport_size = viewport_size
		queue_redraw()

func center(cell: Vector2i) -> Vector2:
	return layout.cell_center(cell)

func _draw() -> void:
	if session == null:
		return
	layout.configure(get_viewport_rect().size, int(session.level.grid_size))
	draw_style_box(_board_style(), layout.board_rect)
	var result := session.trace()
	_draw_beams(result.segments)
	_draw_blockers()
	_draw_relays(result)
	_draw_pieces(result)
	var start_lit: bool = session.completed or result.segments.size() > 0
	_draw_node(session.level.start, "آغاز", NeyroTheme.PRIMARY, start_lit)
	_draw_node(session.level.goal, "ستاره", NeyroTheme.SUCCESS if session.completed else NeyroTheme.ACCENT, session.completed)

func _board_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = NeyroTheme.SURFACE
	style.border_color = NeyroTheme.BORDER
	style.set_border_width_all(2)
	style.set_corner_radius_all(30)
	return style

func _draw_beams(segments: Array) -> void:
	for segment in segments:
		var from := Vector2i(segment[0])
		var to := Vector2i(segment[1])
		var direction := layout.direction_between(from, to)
		var start := _beam_port(from, direction)
		var finish := _beam_port(to, posmod(direction + 2, 4))
		draw_line(start, finish, NeyroTheme.ENERGY_GLOW, 28.0, true)
		draw_line(start, finish, NeyroTheme.ENERGY, 9.0, true)

func _beam_port(cell: Vector2i, direction: int) -> Vector2:
	if cell == session.level.start or cell == session.level.goal or session.level.relays.has(cell):
		return layout.circle_port(cell, direction)
	if _piece_index(cell) >= 0 or session.level.blockers.has(cell):
		return layout.tile_port(cell, direction)
	return layout.cell_center(cell)

func _draw_blockers() -> void:
	for blocker in session.level.blockers:
		var rect := layout.tile_rect(blocker)
		draw_rect(rect, NeyroTheme.BLOCKER_FILL, true)
		draw_rect(rect, NeyroTheme.BLOCKER_BORDER, false, 4.0)
		draw_string(ui_font, rect.position + Vector2(0, rect.size.y * 0.65), "×", HORIZONTAL_ALIGNMENT_CENTER, int(rect.size.x), int(rect.size.y * 0.58), NeyroTheme.TEXT_MUTED)

func _draw_relays(result: Dictionary) -> void:
	for relay_index in range(session.level.relays.size()):
		var relay: Vector2i = session.level.relays[relay_index]
		var lit: bool = result.lit_relays.has(relay_index)
		var radius := layout.node_radius * 0.72
		var point := center(relay)
		draw_circle(point, radius, NeyroTheme.NODE_ACTIVE_FILL if lit else Color("2d2437"))
		draw_arc(point, radius, 0, TAU, 36, NeyroTheme.SUCCESS if lit else NeyroTheme.WARNING, 5.0, true)
		draw_string(ui_font, point + Vector2(-radius, radius * 0.34), NeyroTheme.to_persian_digits(relay_index + 1), HORIZONTAL_ALIGNMENT_CENTER, int(radius * 2), int(radius * 0.8), NeyroTheme.TEXT)

func _draw_pieces(result: Dictionary) -> void:
	for index in range(session.level.pieces.size()):
		var piece: Dictionary = session.level.pieces[index]
		var active: bool = result.hit_pieces.has(index)
		var edge := NeyroTheme.WARNING if session.last_hint == index else (NeyroTheme.SUCCESS if active else Color("6377af"))
		var rect := layout.tile_rect(piece.cell)
		draw_rect(rect, NeyroTheme.ACTIVE_FILL if active else NeyroTheme.SURFACE_ACTIVE, true)
		draw_rect(rect, edge, false, 4.0)
		var glyph := _glyph(piece, session.orientations[index])
		draw_string(ui_font, rect.position + Vector2(0, rect.size.y * 0.66), glyph, HORIZONTAL_ALIGNMENT_CENTER, int(rect.size.x), int(rect.size.y * 0.62), NeyroTheme.TEXT)

func _glyph(piece: Dictionary, orientation: int) -> String:
	if piece.kind == "rail":
		return "—" if orientation == 0 else "│"
	return "╱" if orientation == 0 else "╲"

func _draw_node(cell: Vector2i, text: String, color: Color, lit: bool) -> void:
	var point := center(cell)
	var radius := layout.node_radius
	if lit:
		draw_circle(point, radius + 13.0, Color(color, 0.17))
	draw_circle(point, radius, NeyroTheme.NODE_FILL if not lit else NeyroTheme.NODE_ACTIVE_FILL)
	draw_arc(point, radius, 0, TAU, 48, color, 6.0, true)
	draw_string(ui_font, point + Vector2(-radius, radius * 0.28), text, HORIZONTAL_ALIGNMENT_CENTER, int(radius * 2), int(radius * 0.62), NeyroTheme.TEXT if lit else color)

func _piece_index(cell: Vector2i) -> int:
	for index in range(session.level.pieces.size()):
		if session.level.pieces[index].cell == cell:
			return index
	return -1

func _unhandled_input(event: InputEvent) -> void:
	if session == null or not (event is InputEventMouseButton and event.pressed):
		return
	for index in range(session.level.pieces.size()):
		var cell: Vector2i = session.level.pieces[index].cell
		if layout.tile_rect(cell).has_point(event.position):
			piece_tapped.emit(index)
			get_viewport().set_input_as_handled()
			return
