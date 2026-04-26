<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Imports\StudentImport;
use App\Models\Student;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class StudentController extends Controller
{
    /**
     * Helper: bangun profile_photo_url dengan cache-busting ?v=timestamp.
     * Dipanggil setelah student di-save agar updated_at sudah final.
     */
    private function buildPhotoUrl(Student $student): ?string
    {
        if (!$student->profile_photo) {
            return null;
        }

        return Storage::url($student->profile_photo)
            . '?v=' . $student->updated_at->timestamp;
    }

    public function index(Request $request)
    {
        $search = $request->input('search');

        $students = Student::with([
                'user:id,username,role',
                'workshop:id,name',
            ])
            ->select('id', 'nis', 'full_name', 'class', 'major', 'workshop_id', 'user_id', 'gelombang', 'profile_photo', 'updated_at')
            ->when($search, function ($query, $search) {
                $query->where('full_name', 'like', "%{$search}%")
                      ->orWhere('nis', 'like', "%{$search}%");
            })
            ->orderBy('full_name')
            ->get();

        foreach ($students as $student) {
            $student->profile_photo_url = $this->buildPhotoUrl($student);
        }

        return Inertia::render('Admin/Student/Index', [
            'title'    => 'Data Siswa Prakerin',
            'students' => $students,
        ]);
    }

    public function show($id)
    {
        $student = Student::with([
            'user:id,username,role',
            'workshop:id,name,address,supervisor_id',
            'workshop.supervisor:id,full_name',
        ])
        ->select('id', 'nis', 'full_name', 'class', 'major', 'workshop_id', 'user_id', 'gelombang', 'profile_photo', 'updated_at')
        ->findOrFail($id);

        $student->profile_photo_url = $this->buildPhotoUrl($student);

        $currentDate     = now()->format('Y-m-d');
        $latest_activity = [
            'attendance' => $student->attendances()
                ->whereDate('check_in', $currentDate)
                ->latest()
                ->first(),
            'journal' => $student->journals()
                ->whereDate('date', $currentDate)
                ->latest()
                ->first(),
        ];

        return Inertia::render('Admin/Student/Show', [
            'title'           => 'Informasi Siswa Prakerin',
            'student'         => $student,
            'latest_activity' => $latest_activity,
        ]);
    }

    public function edit($id)
    {
        $student = Student::with([
            'user:id,username,role',
            'workshop:id,name',
        ])
        ->select('id', 'nis', 'full_name', 'class', 'major', 'workshop_id', 'user_id', 'gelombang', 'profile_photo', 'updated_at')
        ->findOrFail($id);

        $student->profile_photo_url = $this->buildPhotoUrl($student);

        $workshops = Workshop::select('id', 'name')
            ->orderBy('name')
            ->get()
            ->map(fn($w) => ['value' => (string) $w->id, 'label' => $w->name]);

        return Inertia::render('Admin/Student/Edit', [
            'title'     => 'Edit Siswa Prakerin',
            'student'   => $student,
            'workshops' => $workshops,
        ]);
    }

    public function create()
    {
        $workshops = Workshop::select('id', 'name')
            ->orderBy('name')
            ->get()
            ->map(fn($w) => ['value' => (string) $w->id, 'label' => $w->name]);

        return Inertia::render('Admin/Student/Create', [
            'title'     => 'Tambah Siswa Prakerin',
            'workshops' => $workshops,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nis'           => 'required|string|max:20|unique:students,nis',
            'full_name'     => 'required|string|max:100',
            'class'         => 'required|string|max:20',
            'major'         => 'required|string|max:100',
            'workshop_id'   => 'required|exists:workshops,id',
            'gelombang'     => 'required|in:1,2',
            'profile_photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $user = User::create([
            'username' => $validated['nis'],
            'password' => bcrypt(config('app.default_password', 'password')),
            'role'     => User::STUDENT_ROLE,
        ]);

        $photoPath = null;
        if ($request->hasFile('profile_photo')) {
            $photoPath = $request->file('profile_photo')->store('students/photos', 'public');
        }

        Student::create(array_merge(
            $validated,
            [
                'user_id'       => $user->id,
                'profile_photo' => $photoPath,
            ]
        ));

        Session::flash('success', 'Siswa Prakerin baru berhasil ditambahkan');
        return Inertia::location('/admin/student');
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'nis'           => 'required|string|max:20',
            'full_name'     => 'required|string|max:100',
            'class'         => 'required|string|max:20',
            'major'         => 'required|string|max:100',
            'workshop_id'   => 'required|exists:workshops,id',
            'gelombang'     => 'required|in:1,2',
            'profile_photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'remove_photo'  => 'nullable|boolean',
        ]);

        $student = Student::with('user:id,username')->findOrFail($id);

        // Cek duplikasi NIS
        $existingStudent = Student::where('nis', $validated['nis'])
            ->where('id', '<>', $student->id)
            ->exists();

        if ($existingStudent) {
            return back()->withErrors(['nis' => 'NIS telah digunakan siswa lain']);
        }

        // Update username jika NIS berubah
        if ($student->nis !== $validated['nis']) {
            $student->user->update(['username' => $validated['nis']]);
        }

        if ($request->hasFile('profile_photo')) {
            // Hapus foto lama
            if ($student->profile_photo && Storage::disk('public')->exists($student->profile_photo)) {
                Storage::disk('public')->delete($student->profile_photo);
            }
            // Simpan foto baru
            $validated['profile_photo'] = $request->file('profile_photo')
                ->store('students/photos', 'public');

        } elseif ($request->boolean('remove_photo')) {
            // Hapus foto tanpa upload baru
            if ($student->profile_photo && Storage::disk('public')->exists($student->profile_photo)) {
                Storage::disk('public')->delete($student->profile_photo);
            }
            $validated['profile_photo'] = null;

        } else {
            // Tidak ada perubahan foto, jangan overwrite kolom profile_photo
            unset($validated['profile_photo']);
        }

        // Bersihkan field non-kolom sebelum update
        unset($validated['remove_photo']);

        $student->update($validated);

        // Re-fetch student untuk memastikan updated_at sudah nilai terbaru dari DB
        $student->refresh();
        $student->profile_photo_url = $this->buildPhotoUrl($student);

        $workshops = Workshop::select('id', 'name')
            ->orderBy('name')
            ->get()
            ->map(fn($w) => ['value' => (string) $w->id, 'label' => $w->name]);

        Session::flash('success', 'Siswa Prakerin berhasil diperbarui');

        return Inertia::render('Admin/Student/Edit', [
            'title'     => 'Edit Siswa Prakerin',
            'student'   => $student,
            'workshops' => $workshops,
        ]);
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
        $filePath = $file->storeAs('private/import/students', $fileName);

        try {
            Excel::import(new StudentImport(), $filePath);
        } catch (\Exception $e) {
            return back()->withErrors(['message' => $e->getMessage()]);
        }

        Session::flash('success', 'File berhasil diunggah dan disimpan.');
        return Inertia::location('/admin/student');
    }

    public function destroy($id)
    {
        $student = Student::with('user:id')->findOrFail($id);

        if ($student->profile_photo && Storage::disk('public')->exists($student->profile_photo)) {
            Storage::disk('public')->delete($student->profile_photo);
        }

        $student->user->delete();
        $student->delete();

        Session::flash('success', 'Siswa berhasil dihapus');
        return Inertia::location('/admin/student');
    }
}