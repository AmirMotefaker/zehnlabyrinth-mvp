class_name PuzzleSession
extends RefCounted

signal changed
signal stage_completed(reward: int)
const HINT_COST := 25
var age_band := "adult"
var difficulty := "hard"
var stage := 1
var profile: Dictionary
var level: Dictionary
var orientations: Array[int] = []
var pulse := 1
var memory: Array[int] = []
var moves := 0
var hints_used := 0
var completed := false
var last_hint := -1

func _init(new_age := "adult", new_difficulty := "hard", new_stage := 1) -> void:
	load_stage(new_age,new_difficulty,new_stage)

func load_stage(new_age: String, new_difficulty: String, new_stage: int) -> void:
	age_band=new_age; difficulty=new_difficulty; stage=clampi(new_stage,1,LevelCatalog.STAGES_PER_TRACK)
	profile=LevelCatalog.profile_for(age_band,difficulty,stage)
	level=LevelGenerator.generate(profile)
	orientations=level.initial.duplicate()
	pulse=1; memory=[]; moves=0; hints_used=0; completed=false; last_hint=-1
	changed.emit()

func trace() -> Dictionary: return BeamSolver.trace(level,orientations)
func rotate_piece(index: int) -> void:
	if completed:return
	orientations[index]=1-orientations[index]; moves+=1; last_hint=-1; changed.emit()
func expected_orientation(index: int) -> int:
	var piece:Dictionary=level.pieces[index]
	return 1-piece.solution if int(profile.pulses)==2 and pulse==2 and piece.kind=="charged" else piece.solution
func use_hint() -> Dictionary:
	if completed:return {"kind":"locked"}
	for index in range(orientations.size()):
		if orientations[index]!=expected_orientation(index):
			orientations[index]=expected_orientation(index);moves+=1;hints_used+=1;last_hint=index;changed.emit()
			return {"kind":"piece","index":index,"cost":HINT_COST}
	return {"kind":"pulse","cost":0}

func _finish() -> Dictionary:
	completed=true
	var reward:=max(10,220-hints_used*HINT_COST-max(0,moves-int(level.par_moves))*10)
	stage_completed.emit(reward);changed.emit()
	return {"kind":"complete","reward":reward}

func send_pulse() -> Dictionary:
	if completed:return {"kind":"locked"}
	var result:=trace()
	if int(profile.pulses)==1:
		if result.reached_goal and result.lit_relays.size()==level.relays.size():
			return _finish()
		return {"kind":"error","message":"پالس باید همهٔ رله‌های لازم را روشن کند و به ستاره برسد."}
	if pulse==1:
		if result.lit_relays!=level.first_pulse:return {"kind":"error","message":"پالس اول باید رله‌های مشخص‌شده را روشن کند."}
		memory=result.lit_relays.duplicate()
		for index in result.charged_hits:orientations[index]=1-orientations[index]
		pulse=2;changed.emit();return {"kind":"stored","message":"حافظه ثبت شد؛ آینهٔ شارژشونده چرخید."}
	var sequence:Array[int]=memory+result.lit_relays
	if result.reached_goal and sequence==level.sequence:
		return _finish()
	return {"kind":"error","message":"پالس دوم باید توالی را کامل و ستاره را روشن کند."}
