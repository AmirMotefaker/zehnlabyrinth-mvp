class_name BeamSolver
extends RefCounted

const GRID_SIZE := 5
const DIRS: Array[Vector2i] = [Vector2i.RIGHT, Vector2i.DOWN, Vector2i.LEFT, Vector2i.UP]

static func reflect(direction: int, slash: int) -> int:
	return [3, 2, 1, 0][direction] if slash == 0 else [1, 0, 3, 2][direction]

static func trace(level: Dictionary, orientations: Array[int]) -> Dictionary:
	var position: Vector2i = level.start
	var direction: int = level.start_direction
	var segments: Array[PackedVector2Array] = []
	var hit_pieces: Array[int] = []
	var lit_relays: Array[int] = []
	var charged_hits: Array[int] = []
	var reached_goal := false
	for _step in 36:
		var next := position + DIRS[direction]
		segments.append(PackedVector2Array([Vector2(position), Vector2(next)]))
		position = next
		if position.x < 0 or position.y < 0 or position.x >= GRID_SIZE or position.y >= GRID_SIZE or level.blockers.has(position):
			break
		var relay_index := level.relays.find(position)
		if relay_index >= 0 and not lit_relays.has(relay_index):
			lit_relays.append(relay_index)
		if position == level.goal:
			reached_goal = true
			break
		var piece_index := _piece_index(level.pieces, position)
		if piece_index < 0:
			continue
		hit_pieces.append(piece_index)
		var piece: Dictionary = level.pieces[piece_index]
		if piece.kind == "rail":
			var horizontal := orientations[piece_index] == 0
			if (horizontal and direction in [0, 2]) or (not horizontal and direction in [1, 3]):
				continue
			break
		if piece.kind == "charged":
			charged_hits.append(piece_index)
		direction = reflect(direction, orientations[piece_index])
	return {"segments": segments, "hit_pieces": hit_pieces, "lit_relays": lit_relays, "charged_hits": charged_hits, "reached_goal": reached_goal}

static func _piece_index(pieces: Array, cell: Vector2i) -> int:
	for index in range(pieces.size()):
		if pieces[index].cell == cell:
			return index
	return -1
