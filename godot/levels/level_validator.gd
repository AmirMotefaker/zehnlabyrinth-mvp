class_name LevelValidator
extends RefCounted

## The generator is only allowed to publish stages that this validator accepts.
static func validate_shape(level: Dictionary, profile: Dictionary) -> Dictionary:
	var errors: Array[String] = []
	if level.get("pieces", []).size() < 1:
		errors.append("stage has no interactive pieces")
	if level.get("start", Vector2i(-1, -1)) == level.get("goal", Vector2i(-1, -1)):
		errors.append("start and goal overlap")
	if level.get("relays", []).size() > profile.relays:
		errors.append("relay budget exceeded")
	if level.get("blockers", []).has(level.get("start")) or level.get("blockers", []).has(level.get("goal")):
		errors.append("critical node blocked")
	return {"valid": errors.is_empty(), "errors": errors}
