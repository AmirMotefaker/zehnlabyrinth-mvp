class_name BoardLayout
extends RefCounted

## The single pixel geometry authority for NEYRO boards.
const OUTER_MARGIN := 44.0
const TOP := 360.0
const BOTTOM_MARGIN := 54.0
const MAX_TILE := 104.0
const TILE_RATIO := 0.66

var board_rect := Rect2()
var grid_size := 5
var step := 140.0
var tile_size := 92.0
var node_radius := 46.0
var origin := Vector2.ZERO

func configure(viewport_size: Vector2, next_grid_size: int) -> void:
	grid_size = max(2, next_grid_size)
	var width: float = maxf(320.0, viewport_size.x - OUTER_MARGIN * 2.0)
	var height: float = maxf(340.0, viewport_size.y - TOP - BOTTOM_MARGIN)
	board_rect = Rect2(Vector2(OUTER_MARGIN, TOP), Vector2(width, height))
	step = min(width / float(grid_size - 1), height / float(grid_size - 1))
	tile_size = min(MAX_TILE, step * TILE_RATIO)
	node_radius = min(tile_size * 0.60, step * 0.42)
	origin = board_rect.get_center() - Vector2.ONE * (float(grid_size - 1) * step * 0.5)

func cell_center(cell: Vector2i) -> Vector2:
	return origin + Vector2(cell.x * step, cell.y * step)

func tile_rect(cell: Vector2i) -> Rect2:
	return Rect2(cell_center(cell) - Vector2.ONE * tile_size * 0.5, Vector2.ONE * tile_size)

func direction_vector(direction: int) -> Vector2:
	return [Vector2.RIGHT, Vector2.DOWN, Vector2.LEFT, Vector2.UP][posmod(direction, 4)]

func direction_between(from: Vector2i, to: Vector2i) -> int:
	var delta := to - from
	if delta.x > 0: return 0
	if delta.y > 0: return 1
	if delta.x < 0: return 2
	return 3

func circle_port(cell: Vector2i, direction: int) -> Vector2:
	return cell_center(cell) + direction_vector(direction) * node_radius

func tile_port(cell: Vector2i, direction: int) -> Vector2:
	return cell_center(cell) + direction_vector(direction) * tile_size * 0.5
