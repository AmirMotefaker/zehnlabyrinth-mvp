class_name PuzzleSession
extends RefCounted

signal changed
signal completed(reward: int)
const HINT_COST := 25
var level: Dictionary
var orientations: Array[int] = []
var pulse := 1
var memory: Array[int] = []
var moves := 0
var hints_used := 0
var completed := false
var last_hint := -1

func _init() -> void:
	level = {"start": Vector2i(0, 2), "start_direction": 0, "goal": Vector2i(2, 4),
		"pieces": [{"cell": Vector2i(1, 2), "kind": "rail", "solution": 0}, {"cell": Vector2i(2, 2), "kind": "charged", "solution": 0}],
		"relays": [Vector2i(2, 1), Vector2i(2, 0), Vector2i(2, 3)],
		"blockers": [Vector2i(1, 1), Vector2i(3, 2)], "first_pulse": [0, 1], "sequence": [0, 1, 2], "par_moves": 2}
	orientations = [0, 0]

func trace() -> Dictionary:
	return BeamSolver.trace(level, orientations)

func rotate_piece(index: int) -> void:
	if completed: return
	orientations[index] = 1 - orientations[index]
	moves += 1
	last_hint = -1
	changed.emit()

func expected_orientation(index: int) -> int:
	var piece: Dictionary = level.pieces[index]
	return 1 - piece.solution if pulse == 2 and piece.kind == "charged" else piece.solution

func use_hint() -> Dictionary:
	if completed: return {"kind": "locked"}
	for index in range(orientations.size()):
		if orientations[index] != expected_orientation(index):
			orientations[index] = expected_orientation(index)
			moves += 1; hints_used += 1; last_hint = index; changed.emit()
			return {"kind": "piece", "index": index, "cost": HINT_COST}
	return {"kind": "pulse", "cost": 0}

func send_pulse() -> Dictionary:
	if completed: return {"kind": "locked"}
	var result := trace()
	if pulse == 1:
		if result.lit_relays != level.first_pulse:
			return {"kind": "error", "message": "پالس اول باید رله‌های ۱ و ۲ را به ترتیب روشن کند."}
		memory = result.lit_relays.duplicate()
		for piece_index in result.charged_hits: orientations[piece_index] = 1 - orientations[piece_index]
		pulse = 2; changed.emit()
		return {"kind": "stored", "message": "حافظه ثبت شد؛ آینهٔ بنفش برای پالس دوم چرخید."}
	var sequence: Array[int] = memory + result.lit_relays
	if result.reached_goal and sequence == level.sequence:
		completed = true
		var reward := max(10, 220 - hints_used * HINT_COST - max(0, moves - level.par_moves) * 10)
		completed.emit(reward); changed.emit()
		return {"kind": "complete", "reward": reward}
	return {"kind": "error", "message": "پالس دوم باید رلهٔ ۳ و سپس ستاره را روشن کند."}
