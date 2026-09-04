class_name LevelCatalog
extends RefCounted

## Nine distinct tracks: 3 age bands × 3 complexity modes × 1,000 stages.
const STAGES_PER_TRACK := 1000
const AGE_BANDS := ["kid", "teen", "adult"]
const DIFFICULTIES := ["easy", "medium", "hard"]

static func total_stages() -> int:
	return AGE_BANDS.size() * DIFFICULTIES.size() * STAGES_PER_TRACK

static func stage_id(age_band: String, difficulty: String, stage: int) -> String:
	assert(AGE_BANDS.has(age_band)); assert(DIFFICULTIES.has(difficulty))
	assert(stage >= 1 and stage <= STAGES_PER_TRACK)
	return "%s-%s-%04d" % [age_band,difficulty,stage]

static func seed_for(age_band: String, difficulty: String, stage: int) -> int:
	return (AGE_BANDS.find(age_band)+1)*10000000 + (DIFFICULTIES.find(difficulty)+1)*1000000 + stage*7919

static func profile_for(age_band: String, difficulty: String, stage: int) -> Dictionary:
	var progress := float(stage-1)/float(STAGES_PER_TRACK-1)
	var age := AGE_BANDS.find(age_band)
	var mode := DIFFICULTIES.find(difficulty)
	var track := age_band+"-"+difficulty
	var chapter := 1+int(progress*7.999)
	var rules := _track_rules(track, chapter)
	return {"id":stage_id(age_band,difficulty,stage),"seed":seed_for(age_band,difficulty,stage),
		"age_band":age_band,"difficulty":difficulty,"chapter":chapter,"template":(stage+age*2+mode)%3,
		"track_name":rules.name,"track_rules":rules.rules,
		"grid_size":5,"pieces":2+min(4,int(progress*4.0)),
		"relays":rules.relays,"blockers":rules.blockers,"pulses":rules.pulses,
		"charged_mirrors":1 if rules.pulses == 2 else 0,"decoys":min(4,int(progress*4.0)),
		"par_moves":rules.par_moves+int(progress*8.0)}

static func _track_rules(track: String, chapter: int) -> Dictionary:
	var table := {
		"kid-easy":{"name":"نورآموز","rules":"۱ پالس · بدون مانع · مسیر کوتاه","relays":0,"blockers":0,"pulses":1,"par_moves":3},
		"kid-medium":{"name":"نورجو","rules":"۱ پالس · گرهٔ رنگی · مسیر خمیده","relays":1,"blockers":0,"pulses":1,"par_moves":4},
		"kid-hard":{"name":"نورنگهبان","rules":"۱ پالس · دو گره · دیوار امن","relays":2,"blockers":1,"pulses":1,"par_moves":5},
		"teen-easy":{"name":"مسیرساز","rules":"۱ پالس · چرخش‌های بیشتر","relays":0,"blockers":1,"pulses":1,"par_moves":4},
		"teen-medium":{"name":"گره‌خوان","rules":"۱ پالس · رلهٔ ترتیبی · دیوار","relays":1+int(chapter/3),"blockers":1,"pulses":1,"par_moves":5},
		"teen-hard":{"name":"حافظهٔ نور","rules":"۲ پالس · حافظه · آینهٔ شارژشونده","relays":2,"blockers":1,"pulses":2,"par_moves":6},
		"adult-easy":{"name":"شبکه‌خوان","rules":"۱ پالس · شاخهٔ فریبنده","relays":1,"blockers":2,"pulses":1,"par_moves":5},
		"adult-medium":{"name":"تحلیل‌گر شبکه","rules":"۱ پالس · رلهٔ ترتیبی · شاخهٔ فریبنده","relays":2+int(chapter/4),"blockers":2,"pulses":1,"par_moves":6},
		"adult-hard":{"name":"معمار پالس","rules":"۲ پالس · حافظه · شارژ · فریب","relays":3,"blockers":2,"pulses":2,"par_moves":7}
	}
	return table[track]
