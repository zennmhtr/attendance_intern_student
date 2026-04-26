<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ShiftController extends Controller
{
    public function index(): Response
    {
        $shifts = Shift::orderBy('location')->orderBy('check_in_start')->get()
            ->map(fn($s) => [
                'id'              => $s->id,
                'name'            => $s->name,
                'location'        => $s->location,
                'check_in_start'  => substr($s->check_in_start, 0, 5),
                'check_in_end'    => substr($s->check_in_end, 0, 5),
                'check_out_start' => substr($s->check_out_start, 0, 5),
                'check_out_end'   => substr($s->check_out_end, 0, 5),
                'is_active'       => $s->is_active,
            ]);

        $grouped = $shifts->groupBy('location')->map(fn($items, $location) => [
            'location' => $location,
            'shifts'   => $items->values(),
        ])->values();

        return Inertia::render('Admin/Shift/Index', [
            'title'   => 'Manajemen Shift TBOG',
            'grouped' => $grouped,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'location'        => 'required|string|max:100',
            'name'            => 'required|string|max:50',
            'check_in_start'  => 'required|date_format:H:i,H:i:s',
            'check_in_end'    => 'required|date_format:H:i,H:i:s',
            'check_out_start' => 'required|date_format:H:i,H:i:s',
            'check_out_end'   => 'required|date_format:H:i,H:i:s',
            'is_active'       => 'boolean',
        ]);

        foreach (['check_in_start', 'check_in_end', 'check_out_start', 'check_out_end'] as $field) {
            $validated[$field] = substr($validated[$field], 0, 5);
        }

        $shift = Shift::create(array_merge($validated, ['is_active' => true]));

        return response()->json([
            'success' => true,
            'message' => 'Shift berhasil ditambahkan',
            'shift'   => $shift,
        ]);
    }

    public function update(Request $request, Shift $shift): JsonResponse
    {
        $validated = $request->validate([
            'location'        => 'required|string|max:100',
            'name'            => 'required|string|max:50',
            'check_in_start'  => 'required|date_format:H:i,H:i:s',
            'check_in_end'    => 'required|date_format:H:i,H:i:s',
            'check_out_start' => 'required|date_format:H:i,H:i:s',
            'check_out_end'   => 'required|date_format:H:i,H:i:s',
        ]);

        foreach (['check_in_start', 'check_in_end', 'check_out_start', 'check_out_end'] as $field) {
            $validated[$field] = substr($validated[$field], 0, 5);
        }

        $shift->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Shift berhasil diperbarui',
            'shift'   => $shift->fresh(),
        ]);
    }

    public function toggleActive(Request $request, Shift $shift): JsonResponse
    {
        $shift->update(['is_active' => !$shift->is_active]);

        return response()->json([
            'success' => true,
            'message' => 'Status shift berhasil diubah',
            'is_active' => $shift->is_active,
        ]);
    }

    public function destroy(Shift $shift): JsonResponse
    {
        $shift->delete();

        return response()->json([
            'success' => true,
            'message' => 'Shift berhasil dihapus',
        ]);
    }
}