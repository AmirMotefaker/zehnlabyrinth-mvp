class_name LevelCatalog
extends RefCounted

## 3 age bands × 3 difficulty modes × 1,000 deterministic stages.
const STAGES_PER_TRACK := 1000
const AGE_BANDS := ["kid", "teen", "adult"]
const DIFFICULTIES := ["easy", "medium", "hard"]

static func total_stages() -> int:
	return AGE_BANDS.size() * DIFFICULTIES.size() * STAGES_PER_TRACK

static func stage_id(age_band: String, difficulty: String, stage: int) -> String:
	assert(AGE_BANDS.has(age_band))
	assert(DIFFICULTIES.has(difficulty))
	assert(stage >= 1 and stage <= STAGES_PER_TRACK)
	return "%s-%s-%04d" % [age_band, difficulty, stage]

static func seed_for(age_band: String, difficulty: String, stage: int) -> int:
	var age := AGE_BANDS.find(age_band) + 1
	var mode := DIFFICULTIES.find(difficulty) + 1
	return age * 10000000 + mode * 1000000 + stage * 7919

static func profile_for(age_band: String, difficulty: String, stage: int) -> Dictionary:
	var progress := float(stage - 1) / float(STAGES_PER_TRACK - 1)
	var age_index := AGE_BANDS.find(age_band)
	var difficulty_index := DIFFICULTIES.find(difficulty)
	var tier := age_index * 3 + difficulty_index
	return {
		"id": stage_id(age_band, difficulty, stage),
		"seed": seed_for(age_band, difficulty, stage),
		"age_band": age_band,
		"difficulty": difficulty,
		"grid_size": clampi(4 + int(progress * 3.0) + int(tier / 3), 4, 9),
		"pieces": clampi(2 + tier + int(progress * 8.0), 2, 18),
		"relays": clampi(int(progress * 4.0) + (1 if difficulty != "easy" else 0), 0, 5),
		"blockers": clampi(int(progress * 5.0) + tier / 2, 0, 8),
		"pulses": 1 if difficulty == "easy" and stage < 450 else (2 if progress < 0.82 else 3),
		"charged_mirrors": 0 if difficulty == "easy" else clampi(int(progress * 3.0), 0, 3),
		"gates": 0 if tier < 4 else clampi(int(progress * 3.0), 0, 3),
		"move_budget": max(3, 8 + int(progress * 25.0) - tier)
	}
