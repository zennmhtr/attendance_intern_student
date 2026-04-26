<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Imports\WorkshopImport;
use App\Models\Supervisor;
use App\Models\Workshop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class WorkshopController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $workshops = Workshop::with([
                'supervisor:id,full_name',
                'students:id,workshop_id,major',
            ])
            ->select('id', 'name', 'owner_name', 'phone', 'address', 'latitude', 'longitude', 'supervisor_id')
            ->when($search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('address', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Workshop/Index', [
            'title'     => 'Data Lokasi Prakerin',
            'workshops' => $workshops,
        ]);
    }

    public function create()
    {
        $supervisors = Supervisor::doesntHave('workshops')
            ->select('id', 'full_name')
            ->orderBy('full_name')
            ->get()
            ->map(fn($s) => ['value' => (string) $s->id, 'label' => $s->full_name]);

        return Inertia::render('Admin/Workshop/Create', [
            'title'       => 'Tambah Lokasi Prakerin',
            'supervisors' => $supervisors,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required',
            'owner_name' => 'required',
            'phone'      => 'required',
            'address'    => 'required',
            'latitude'   => 'required',
            'longitude'  => 'required',
        ]);

        $supervisorId = ($request->supervisor_id !== '' && $request->supervisor_id !== null)
            ? $request->supervisor_id
            : null;

        if ($supervisorId) {
            $supervisorHasWorkshop = Workshop::where('supervisor_id', $supervisorId)->exists();
            if ($supervisorHasWorkshop) {
                return back()->withErrors(['message' => 'Pembimbing sudah ditugaskan di Lokasi lain']);
            }
        }

        Workshop::create([
            'name'          => $validated['name'],
            'owner_name'    => $validated['owner_name'],
            'phone'         => $validated['phone'],
            'address'       => $validated['address'],
            'latitude'      => (float) $validated['latitude'],
            'longitude'     => (float) $validated['longitude'],
            'supervisor_id' => $supervisorId,
        ]);

        Session::flash('success', 'Lokasi Prakerin baru berhasil ditambahkan');
        return Inertia::location('/admin/workshop');
    }

    public function show($id)
    {
        $workshop = Workshop::with([
            'supervisor:id,full_name',
            'students:id,full_name,nis,class,major,workshop_id',
        ])
        ->select('id', 'name', 'owner_name', 'phone', 'address', 'latitude', 'longitude', 'supervisor_id')
        ->findOrFail($id);

        return Inertia::render('Admin/Workshop/Show', [
            'title'    => 'Informasi Lokasi Prakerin',
            'workshop' => $workshop,
        ]);
    }

    public function edit($id)
    {
        $workshop = Workshop::select('id', 'name', 'owner_name', 'phone', 'address', 'latitude', 'longitude', 'supervisor_id')
            ->findOrFail($id);
        $supervisors = Supervisor::select('id', 'full_name')
            ->where(function ($query) use ($workshop) {
                $query->doesntHave('workshops')
                      ->orWhereHas('workshops', fn($q) => $q->where('id', $workshop->id));
            })
            ->orderBy('full_name')
            ->get()
            ->map(fn($s) => ['value' => (string) $s->id, 'label' => $s->full_name]);

        return Inertia::render('Admin/Workshop/Edit', [
            'title'       => 'Edit Lokasi Prakerin',
            'workshop'    => $workshop,
            'supervisors' => $supervisors,
        ]);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name'       => 'required',
            'owner_name' => 'required',
            'phone'      => 'required',
            'address'    => 'required',
            'latitude'   => 'required',
            'longitude'  => 'required',
        ]);

        $supervisorId = ($request->supervisor_id !== '' && $request->supervisor_id !== null)
            ? $request->supervisor_id
            : null;

        if ($supervisorId) {
            $supervisorHasOtherWorkshop = Workshop::where('supervisor_id', $supervisorId)
                ->where('id', '!=', $id)
                ->exists();

            if ($supervisorHasOtherWorkshop) {
                return back()->withErrors(['message' => 'Pembimbing sudah ditugaskan di Lokasi Prakerin lain']);
            }
        }

        Workshop::where('id', $id)->update([
            'name'          => $validated['name'],
            'owner_name'    => $validated['owner_name'],
            'phone'         => $validated['phone'],
            'address'       => $validated['address'],
            'latitude'      => (float) $validated['latitude'],
            'longitude'     => (float) $validated['longitude'],
            'supervisor_id' => $supervisorId,
        ]);

        Session::flash('success', 'Lokasi Prakerin berhasil diperbarui');
        return Inertia::location('/admin/workshop');
    }

    public function import(Request $request)
    {
        try {
            $request->validate([
                'file_excel' => 'required|mimes:xlsx|max:2048|file',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors([
                'message' => 'File yang diunggah tidak valid. Pastikan format dan ukuran file sesuai.',
            ]);
        }

        $file     = $request->file('file_excel');
        $fileName = time() . '_' . $file->getClientOriginalName();
        $filePath = $file->storeAs('private/import/workshops', $fileName);

        try {
            Excel::import(new WorkshopImport(), $filePath);
        } catch (\Exception $e) {
            return back()->withErrors(['message' => $e->getMessage()]);
        }

        Session::flash('success', 'File berhasil diunggah dan disimpan.');
        return Inertia::location('/admin/workshop');
    }

    public function destroy($id)
    {
        $workshop = Workshop::findOrFail($id);
        $workshop->delete();

        Session::flash('success', 'Lokasi Prakerin berhasil dihapus');
        return Inertia::location('/admin/workshop');
    }
}