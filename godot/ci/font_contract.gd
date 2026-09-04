extends SceneTree

func _init() -> void:
	if not NeyroTheme.font_contract_ok():
		push_error("NEYRO Persian font contract failed: bundled Vazirmatn is missing required Persian glyphs")
		quit(1)
		return
	print("NEYRO Persian font contract: PASS")
	quit(0)
