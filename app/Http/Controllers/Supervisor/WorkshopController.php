<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\Supervisor;
use App\Models\Workshop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class WorkshopController extends Controller
{
    public function index(Request $request)
    {
        $search     = $request->input('search');
        $supervisor = Supervisor::where('user_id', Auth::id())->first();

        if (!$supervisor) {
            return Inertia::render('Supervisor/Workshop/Index', [
                'title'     => 'Data Lokasi Prakerin',
                'workshops' => [],
            ]);
        }

        $workshops = Workshop::where('supervisor_id', $supervisor->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('address', 'like', "%{$search}%");
                });
            })
            ->paginate(20);

        return Inertia::render('Supervisor/Workshop/Index', [
            'title'     => 'Data Lokasi Prakerin',
            'workshops' => $workshops->items(),
        ]);
    }

    public function show($id)
    {
        $supervisor = Supervisor::where('user_id', Auth::id())->first();

        $workshop = Workshop::with('supervisor', 'students')
            ->where('id', $id)
            ->where('supervisor_id', $supervisor->id)
            ->firstOrFail();

        return Inertia::render('Supervisor/Workshop/Show', [
            'title'    => 'Informasi Lokasi Prakerin',
            'workshop' => $workshop,
        ]);
    }
}