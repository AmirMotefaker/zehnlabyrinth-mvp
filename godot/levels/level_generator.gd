class_name LevelGenerator
extends RefCounted

## Produces a deterministic, solvable two-pulse level from its catalog profile.
static func generate(profile: Dictionary) -> Dictionary:
	var variant := int(profile.seed) % 3
	var level: Dictionary
	if variant == 0:
		level = _vertical()
	elif variant == 1:
		level = _mirrored()
	else:
		level = _sideways()
	level.id = profile.id
	level.profile = profile
	level.initial = level.initial.duplicate()
	_add_decoys(level, profile)
	return level

static func _vertical() -> Dictionary:
	return {"grid_size": 5, "start": Vector2i(0,2), "start_direction": 0, "goal": Vector2i(2,4),
		"pieces": [{"cell":Vector2i(1,2),"kind":"rail","solution":0},{"cell":Vector2i(2,2),"kind":"charged","solution":0}],
		"initial":[1,1], "relays":[Vector2i(2,1),Vector2i(2,0),Vector2i(2,3)],
		"blockers":[Vector2i(1,1),Vector2i(3,2)], "first_pulse":[0,1], "sequence":[0,1,2], "par_moves":2}

static func _mirrored() -> Dictionary:
	return {"grid_size": 5, "start": Vector2i(4,2), "start_direction": 2, "goal": Vector2i(2,4),
		"pieces": [{"cell":Vector2i(3,2),"kind":"rail","solution":0},{"cell":Vector2i(2,2),"kind":"charged","solution":1}],
		"initial":[1,0], "relays":[Vector2i(2,1),Vector2i(2,0),Vector2i(2,3)],
		"blockers":[Vector2i(1,2),Vector2i(3,1)], "first_pulse":[0,1], "sequence":[0,1,2], "par_moves":2}

static func _sideways() -> Dictionary:
	return {"grid_size": 5, "start": Vector2i(2,4), "start_direction": 3, "goal": Vector2i(4,2),
		"pieces": [{"cell":Vector2i(2,3),"kind":"rail","solution":1},{"cell":Vector2i(2,2),"kind":"charged","solution":1}],
		"initial":[0,0], "relays":[Vector2i(1,2),Vector2i(0,2),Vector2i(3,2)],
		"blockers":[Vector2i(2,1),Vector2i(1,3)], "first_pulse":[0,1], "sequence":[0,1,2], "par_moves":2}

static func _add_decoys(level: Dictionary, profile: Dictionary) -> void:
	var candidates := [Vector2i(0,0),Vector2i(4,0),Vector2i(0,4),Vector2i(4,4),Vector2i(1,4),Vector2i(4,1)]
	var count := min(4, int(profile.pieces) - 2)
	for i in range(count):
		var cell: Vector2i = candidates[(int(profile.seed) + i * 5) % candidates.size()]
		if not level.relays.has(cell) and not level.blockers.has(cell) and cell != level.start and cell != level.goal:
			level.pieces.append({"cell":cell,"kind":"mirror","solution":(int(profile.seed)+i)%2})
			level.initial.append(1-((int(profile.seed)+i)%2))
