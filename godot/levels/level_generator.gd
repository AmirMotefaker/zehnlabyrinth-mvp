class_name LevelGenerator
extends RefCounted

## Deterministic playable templates. The catalog supplies the mechanical track;
## this generator changes the topology family and the number of decoys per track.
static func generate(profile: Dictionary) -> Dictionary:
	var template := int(profile.template)
	var level: Dictionary
	if template == 0:
		level = _vertical()
	elif template == 1:
		level = _mirrored()
	else:
		level = _sideways()
	level.id = profile.id
	level.profile = profile
	level.track_name = profile.track_name
	level.track_rules = profile.track_rules
	level.initial = level.initial.duplicate()
	_apply_track(level, profile)
	return level

static func _vertical() -> Dictionary:
	return {"grid_size":5,"start":Vector2i(0,2),"start_direction":0,"goal":Vector2i(2,4),
		"pieces":[{"cell":Vector2i(1,2),"kind":"rail","solution":0},{"cell":Vector2i(2,2),"kind":"charged","solution":0}],
		"initial":[1,1],"relays":[Vector2i(2,1),Vector2i(2,0),Vector2i(2,3)],
		"blockers":[Vector2i(1,1),Vector2i(3,2)],"first_pulse":[0,1],"sequence":[0,1,2],"par_moves":2}

static func _mirrored() -> Dictionary:
	return {"grid_size":5,"start":Vector2i(4,2),"start_direction":2,"goal":Vector2i(2,4),
		"pieces":[{"cell":Vector2i(3,2),"kind":"rail","solution":0},{"cell":Vector2i(2,2),"kind":"charged","solution":1}],
		"initial":[1,0],"relays":[Vector2i(2,1),Vector2i(2,0),Vector2i(2,3)],
		"blockers":[Vector2i(1,2),Vector2i(3,1)],"first_pulse":[0,1],"sequence":[0,1,2],"par_moves":2}

static func _sideways() -> Dictionary:
	return {"grid_size":5,"start":Vector2i(2,4),"start_direction":3,"goal":Vector2i(4,2),
		"pieces":[{"cell":Vector2i(2,3),"kind":"rail","solution":1},{"cell":Vector2i(2,2),"kind":"charged","solution":1}],
		"initial":[0,0],"relays":[Vector2i(1,2),Vector2i(0,2),Vector2i(3,2)],
		"blockers":[Vector2i(2,1),Vector2i(1,3)],"first_pulse":[0,1],"sequence":[0,1,2],"par_moves":2}

static func _apply_track(level: Dictionary, profile: Dictionary) -> void:
	# Every catalog cell varies the playable board rather than only its title.
	var relay_limit := int(profile.relays)
	var blocker_limit := int(profile.blockers)
	while level.relays.size() > relay_limit: level.relays.pop_back()
	while level.blockers.size() > blocker_limit: level.blockers.pop_back()
	if int(profile.pulses) == 1:
		level.first_pulse = []
		level.sequence = []
	for i in range(min(4, int(profile.decoys))):
		var candidates := [Vector2i(0,0),Vector2i(4,0),Vector2i(0,4),Vector2i(4,4)]
		var cell: Vector2i = candidates[(int(profile.seed)+i)%candidates.size()]
		if not level.relays.has(cell) and not level.blockers.has(cell) and cell != level.start and cell != level.goal:
			level.pieces.append({"cell":cell,"kind":"mirror","solution":(int(profile.seed)+i)%2})
			level.initial.append(1-((int(profile.seed)+i)%2))
	level.par_moves = max(level.par_moves, int(profile.par_moves))
