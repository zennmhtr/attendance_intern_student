<?php

namespace App\Http\Controllers\Supervisor;

use App\Exports\AttendanceExport;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\GlobalSetting;
use App\Models\Journal;
use App\Models\Student;
use App\Models\Supervisor;
use App\Models\Workshop;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class StudentController extends Controller
{
    private function buildPhotoUrl(Student $student): ?string
    {
        if (!$student->profile_photo) {
            return null;
        }

        if (!Storage::disk('public')->exists($student->profile_photo)) {
            return null;
        }

        return Storage::url($student->profile_photo)
            . '?v=' . time();
    }

    /**
     * Helper: ambil workshop IDs milik supervisor yang sedang login
     */
    private function getSupervisorWorkshopIds(): \Illuminate\Support\Collection
    {
        $supervisor = Supervisor::where('user_id', Auth::id())->first();

        if (!$supervisor) {
            return collect();
        }

        return Workshop::where('supervisor_id', $supervisor->id)->pluck('id');
    }

    public function index(Request $request)
    {
        $search      = $request->input('search');
        $workshop_id = $request->input('workshop_id');
        $supervisor  = Supervisor::where('user_id', Auth::id())->first();

        if (!$supervisor) {
            return Inertia::location('/');
        }

        $workshops_id = Workshop::where('supervisor_id', $supervisor->id)->pluck('id');

        $students = Student::with('user', 'workshop')
            ->select('id', 'nis', 'full_name', 'class', 'major', 'workshop_id', 'user_id', 'gelombang', 'profile_photo', 'updated_at')
            ->whereIn('workshop_id', $workshops_id)
            ->when($workshop_id, function ($query) use ($workshop_id) {
                $query->where('workshop_id', $workshop_id);
            })
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('full_name', 'like', "%{$search}%")
                      ->orWhere('nis', 'like', "%{$search}%");
                });
            })
            ->paginate(20);

        $students->getCollection()->transform(function ($student) {
            $student->profile_photo_url = $this->buildPhotoUrl($student);
            return $student;
        });

        $workshops = Workshop::where('supervisor_id', $supervisor->id)
            ->select('id', 'name')
            ->get();

        return Inertia::render('Supervisor/Student/Index', [
            'title'     => 'Daftar Siswa Prakerin',
            'students'  => $students->items(),
            'workshops' => $workshops,
        ]);
    }

    public function show($id)
    {
        $workshops_id = $this->getSupervisorWorkshopIds();
        
        // ✅ Perbaikan: Ambil $workshop_id dari request jika ada
        $workshop_id = request()->input('workshop_id');

        $student = Student::with('user', 'workshop.supervisor')
            ->select('id', 'nis', 'full_name', 'class', 'major', 'workshop_id', 'user_id', 'gelombang', 'profile_photo', 'updated_at')
            ->whereIn('workshop_id', $workshops_id)
            ->when($workshop_id, function ($query) use ($workshop_id) {
                $query->where('workshop_id', $workshop_id);
            })
            ->findOrFail($id);

        $student->profile_photo_url = $this->buildPhotoUrl($student);

        $currentDate     = now()->format('Y-m-d');
        $latest_activity = [
            'attendance' => $student->attendances()->whereDate('check_in', $currentDate)->latest()->first(),
            'journal'    => $student->journals()->whereDate('date', $currentDate)->latest()->first(),
        ];

        return Inertia::render('Supervisor/Student/Show', [
            'title'           => 'Informasi Siswa Prakerin',
            'student'         => $student,
            'latest_activity' => $latest_activity,
        ]);
    }

    public function attendanceList(Request $request)
    {
        $filtered_date  = $request->input('date') ?: null;
        $filtered_month = $request->input('month') ?: null;
        $student_id     = $request->input('student_id') ?: null;
        // ✅ Ambil $workshop_id dari request
        $workshop_id    = $request->input('workshop_id') ?: null;

        $supervisor   = Supervisor::where('user_id', Auth::id())->first();
        
        if (!$supervisor) {
            return redirect()->back()->with('error', 'Supervisor tidak ditemukan');
        }
        
        $workshops_id = Workshop::where('supervisor_id', $supervisor->id)->pluck('id');

        // ✅ Perbaiki: Hapus penggunaan $workshop_id yang tidak perlu
        $student_options = Student::with('user')
            ->whereIn('workshop_id', $workshops_id)
            ->when($workshop_id, function ($query) use ($workshop_id) {
                $query->where('workshop_id', $workshop_id);
            })
            ->get();

        // ✅ Perbaiki query attendances
        $attendances = Attendance::with('student')
            ->whereHas('student', function ($query) use ($workshops_id, $workshop_id) {
                $query->whereIn('workshop_id', $workshops_id);
                if ($workshop_id) {
                    $query->where('workshop_id', $workshop_id);
                }
            })
            ->when($filtered_date, function ($query, $filtered_date) {
                $query->whereDate('check_in', $filtered_date);
            })
            ->when($filtered_month, function ($query, $filtered_month) {
                $query->whereMonth('check_in', $filtered_month);
            })
            ->when($student_id, function ($query, $student_id) {
                $query->where('student_id', $student_id);
            })
            ->orderBy('check_in', 'desc')
            ->paginate(20);

        return Inertia::render('Supervisor/Student/Attendance/Index', [
            'title'           => 'Daftar Absensi',
            'attendances'     => $attendances->items(),
            'student_options' => $student_options->map(function ($student) {
                return [
                    'label' => $student->full_name,
                    'value' => "$student->id",
                ];
            }),
        ]);
    }

    public function attendanceDetail($attendance_id)
    {
        $attendance = Attendance::with('student.workshop')->findOrFail($attendance_id);

        return Inertia::render('Supervisor/Student/Attendance/Show', [
            'title'      => 'Detail Absensi Siswa',
            'student'    => $attendance->student,
            'attendance' => $attendance,
        ]);
    }

    private function attendanceExportData($studentId = null, $monthSelected = null, $workshops_id)
    {
        // ✅ Perbaiki: Ambil $workshop_id dari parameter atau request
        $workshop_id = request()->input('workshop_id') ?: null;
        
        $startDate = $monthSelected
            ? Carbon::create(now()->year, $monthSelected, 1)
            : Attendance::whereHas('student', function ($query) use ($workshops_id, $workshop_id) {
                $query->whereIn('workshop_id', $workshops_id);
                if ($workshop_id) {
                    $query->where('workshop_id', $workshop_id);
                }
            })
                ->when($studentId, function ($query) use ($studentId) {
                    $query->where('student_id', $studentId);
                })
                ->orderBy('check_in', 'asc')
                ->value('check_in');

        $startDate = $startDate ? Carbon::parse($startDate)->startOfDay() : now()->startOfDay();
        $endDate   = now()->endOfDay();

        $attendancesFromDb = Attendance::when($studentId, function ($query) use ($studentId) {
            $query->where('student_id', $studentId);
        })
            ->whereBetween('check_in', [$startDate, $endDate])
            ->orderBy('check_in', 'asc')
            ->get()
            ->keyBy(function ($attendance) {
                return Carbon::parse($attendance->check_in)->toDateString();
            });

        $attendances = [];
        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate)) {
            $dateString = $currentDate->toDateString();

            if ($attendancesFromDb->has($dateString)) {
                $attendances[] = $attendancesFromDb->get($dateString);
            } else {
                $attendances[] = [
                    'student_id'    => $studentId,
                    'check_in'      => $currentDate->toDateTimeString(),
                    'check_out'     => null,
                    'status'        => Attendance::ABSENT,
                    'latitude_in'   => null,
                    'longitude_in'  => null,
                    'latitude_out'  => null,
                    'longitude_out' => null,
                    'reason'        => null,
                ];
            }

            $currentDate->addDay();
        }

        return $attendances;
    }

    public function journalList(Request $request)
    {
        $filtered_student = $request->input('student_id') ?: null;
        $filtered_date    = $request->input('date') ?: null;
        $filtered_month   = $request->input('month') ?: null;
        // ✅ Ambil $workshop_id dari request
        $workshop_id      = $request->input('workshop_id') ?: null;

        $supervisor   = Supervisor::where('user_id', Auth::id())->first();
        
        if (!$supervisor) {
            return redirect()->back()->with('error', 'Supervisor tidak ditemukan');
        }
        
        $workshops_id = Workshop::where('supervisor_id', $supervisor->id)->pluck('id');

        // ✅ Perbaiki query student_options
        $student_options = Student::with('user')
            ->whereIn('workshop_id', $workshops_id)
            ->when($workshop_id, function ($query) use ($workshop_id) {
                $query->where('workshop_id', $workshop_id);
            })
            ->get();

        // ✅ Perbaiki query journals
        $journals = Journal::query()
            ->with('student')
            ->whereHas('student', function ($query) use ($workshops_id, $workshop_id) {
                $query->whereIn('workshop_id', $workshops_id);
                if ($workshop_id) {
                    $query->where('workshop_id', $workshop_id);
                }
            })
            ->when($filtered_student, function ($query) use ($filtered_student) {
                $query->where('student_id', $filtered_student);
            })
            ->when($filtered_date, function ($query) use ($filtered_date) {
                $query->where('date', $filtered_date);
            })
            ->when($filtered_month, function ($query) use ($filtered_month) {
                $query->whereMonth('date', $filtered_month);
            })
            ->orderBy('date', 'desc')
            ->paginate(20);

        return Inertia::render('Supervisor/Student/Journal/Index', [
            'title'           => 'Jurnal Prakerin Siswa',
            'journals'        => $journals->items(),
            'student_options' => $student_options->map(function ($student) {
                return [
                    'label' => $student->full_name,
                    'value' => "$student->id",
                ];
            }),
        ]);
    }

    public function journalDetail($id)
    {
        $journal = Journal::with('student')->findOrFail($id);

        return Inertia::render('Supervisor/Student/Journal/Show', [
            'title'   => 'Detail Jurnal Prakerin',
            'journal' => $journal,
        ]);
    }
}