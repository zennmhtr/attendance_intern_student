<?php

namespace App\Http\Controllers\Student;

use App\Exports\AttendanceExport;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\GlobalSetting;
use App\Models\Shift;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class AttendanceController extends Controller
{
    private const SHIFT_MAJORS = ['TBOG', 'TATA BOGA'];

    private function getAuthUser()
    {
        return User::where('id', Auth::id())->with('student')->first();
    }

    private function isShiftMajor(Student $student): bool
    {
        return in_array(strtoupper($student->major ?? ''), self::SHIFT_MAJORS);
    }

    private function currentAttendanceTimeByShift(Shift $shift): string
    {
        $now       = now();
        $tolerance = 15; // menit

        $checkInStart  = Carbon::parse($shift->check_in_start)->subMinutes($tolerance);
        $checkInEnd    = Carbon::parse($shift->check_in_end)->addMinutes($tolerance);
        $checkOutStart = Carbon::parse($shift->check_out_start)->subMinutes($tolerance);
        $checkOutEnd   = Carbon::parse($shift->check_out_end)->addMinutes($tolerance);

        foreach ([$checkInStart, $checkInEnd, $checkOutStart, $checkOutEnd] as $t) {
            $t->setDate($now->year, $now->month, $now->day);
        }

        if ($checkOutEnd->lt($checkOutStart)) {
            $checkOutEnd->addDay();
        }

        if ($now->between($checkInStart, $checkInEnd))   return 'MASUK';
        if ($now->between($checkOutStart, $checkOutEnd)) return 'PULANG';

        return 'DI LUAR WAKTU';
    }

    private function currentAttendanceTimeByGlobal(GlobalSetting $setting): string
    {
        $now       = now();
        $tolerance = 15;

        $checkInStart  = Carbon::parse($setting->check_in_start)->subMinutes($tolerance);
        $checkInEnd    = Carbon::parse($setting->check_in_end)->addMinutes($tolerance);
        $checkOutStart = Carbon::parse($setting->check_out_start)->subMinutes($tolerance);
        $checkOutEnd   = Carbon::parse($setting->check_out_end)->addMinutes($tolerance);

        foreach ([$checkInStart, $checkInEnd, $checkOutStart, $checkOutEnd] as $t) {
            $t->setDate($now->year, $now->month, $now->day);
        }

        if ($checkOutEnd->lt($checkOutStart)) {
            $checkOutEnd->addDay();
        }

        if ($now->between($checkInStart, $checkInEnd))   return 'MASUK';
        if ($now->between($checkOutStart, $checkOutEnd)) return 'PULANG';

        return 'DI LUAR WAKTU';
    }

    public function index(Request $request)
    {
        $user    = $this->getAuthUser();
        $setting = GlobalSetting::first();

        $filtered_date  = $request->input('date')  ?: null;
        $filtered_month = $request->input('month') ?: null;

        $attendances = Attendance::where('student_id', $user->student->id)
            ->with('shift')
            ->when($filtered_date,  fn($q) => $q->whereDate('check_in', $filtered_date))
            ->when($filtered_month, fn($q) => $q->whereMonth('check_in', $filtered_month))
            ->when(!$filtered_date && !$filtered_month, fn($q) => $q->limit(20))
            ->orderBy('check_in', 'desc')
            ->get();

        return inertia('Student/Attendance/Index', [
            'title'       => 'Daftar Absensi',
            'attendances' => $attendances,
            'setting'     => $setting,
        ]);
    }

    public function create(Request $request)
    {
        $user    = $this->getAuthUser();
        $student = Student::with('workshop')->where('id', $user->student->id)->first();
        $setting = GlobalSetting::first();

        $isShiftMajor = $this->isShiftMajor($student);
        $shifts = [];
        if ($isShiftMajor) {
            $workshopName = strtoupper($student->workshop->name ?? '');
            $shifts = Shift::where('is_active', true)
                ->when($workshopName, function ($query) use ($workshopName) {
                    $query->where(function ($q) use ($workshopName) {
                        foreach (['MERCURE', 'QUEST', 'SANTIKA', 'HARRIS', 'SUITES'] as $hotel) {
                            if (str_contains($workshopName, $hotel)) {
                                $q->orWhere('location', 'like', "%{$hotel}%");
                            }
                        }
                    });
                })
                ->orderBy('location')
                ->orderBy('check_in_start')
                ->get()
                ->map(fn($s) => [
                    'value'           => (string) $s->id,
                    'label'           => "{$s->location} — {$s->name} ({$s->check_in_start} - {$s->check_out_start})",
                    'check_in_start'  => $s->check_in_start,
                    'check_in_end'    => $s->check_in_end,
                    'check_out_start' => $s->check_out_start,
                    'check_out_end'   => $s->check_out_end,
                ]);
        }

        $attendance_time_name = null;
        if (!$isShiftMajor) {
            $attendance_time_name = $this->currentAttendanceTimeByGlobal($setting);
        }

        $preselectedShiftId = null;
        if ($isShiftMajor && $request->shift_id) {
            $preselectedShiftId = (string) $request->shift_id;
        }

        return inertia('Student/Attendance/Attendance', [
            'title'                => 'Absensi',
            'student'              => $student,
            'max_radius'           => $setting->max_attendance_radius,
            'shifts'               => $shifts,               // [] jika TKJ/TSM
            'is_shift_major'       => $isShiftMajor,
            'attendance_time_name' => $attendance_time_name, // null jika TBOG
            'preselected_shift_id'   => $preselectedShiftId,    // dari Dashboard
            'utm_source'             => $request->utm_source ?? null,
        ]);
    }

    public function store(Request $request)
    {
        $user    = $this->getAuthUser();
        $student = Student::where('id', $user->student->id)->first();
        $setting = GlobalSetting::first();
        $today   = now()->toDateString();
        if ($this->isShiftMajor($student)) {
            $request->validate([
                'shift_id' => 'required|exists:shifts,id',
            ], [
                'shift_id.required' => 'Pilih shift terlebih dahulu.',
                'shift_id.exists'   => 'Shift tidak valid.',
            ]);

            $shift                = Shift::findOrFail($request->shift_id);
            $attendance_time_name = $this->currentAttendanceTimeByShift($shift);
            $shiftId              = $shift->id;

            if ($attendance_time_name === 'DI LUAR WAKTU') {
                Session::flash('error', "Bukan waktu absen untuk {$shift->name} ({$shift->check_in_start} - {$shift->check_out_start}). Toleransi 15 menit.");
                return back();
            }

        } else {
            $attendance_time_name = $this->currentAttendanceTimeByGlobal($setting);
            $shiftId              = null;

            if ($attendance_time_name === 'DI LUAR WAKTU') {
                Session::flash('error', "Bukan waktu absen. Toleransi 15 menit dari window absensi.");
                return back();
            }
        }

        if ($attendance_time_name === 'MASUK') {
            $request->validate([
                'latitude_in'  => 'required|numeric',
                'longitude_in' => 'required|numeric',
                'status'       => 'required|in:PRESENT,EXCUSED',
            ]);

            Attendance::create([
                'student_id'   => $user->student->id,
                'shift_id'     => $shiftId,
                'latitude_in'  => $request->latitude_in,
                'longitude_in' => $request->longitude_in,
                'status'       => $request->status,
                'check_in'     => now(),
                'reason'       => $request->status === 'EXCUSED' ? $request->reason : null,
            ]);

            Session::flash('success', 'Absensi Masuk Berhasil');

        } elseif ($attendance_time_name === 'PULANG') {
            $request->validate([
                'latitude_out'  => 'required|numeric',
                'longitude_out' => 'required|numeric',
            ]);

            $existingIn = Attendance::where('student_id', $user->student->id)
                ->whereDate('check_in', $today)
                ->first();

            if (!$existingIn) {
                Session::flash('error', 'Kamu belum absen masuk hari ini.');
                return back();
            }

            $existingIn->update([
                'check_out'     => now(),
                'latitude_out'  => $request->latitude_out,
                'longitude_out' => $request->longitude_out,
            ]);

            Session::flash('success', 'Absensi Pulang Berhasil');
        }

        return $request->utm_source === 'student_dashboard'
            ? Inertia::location('/student/dashboard')
            : Inertia::location('/student/attendance');
    }

    public function show($id)
    {
        $attendance = Attendance::with('student.workshop', 'shift')->findOrFail($id);
        return inertia('Student/Attendance/Show', [
            'title'      => 'Detail Absensi',
            'attendance' => $attendance,
            'workshop'   => $attendance->student->workshop,
        ]);
    }

    private function attendanceExport($studentId, $monthSelected = null)
    {
        $startDate = $monthSelected
            ? Carbon::create(now()->year, $monthSelected, 1)
            : Attendance::where('student_id', $studentId)
                ->orderBy('check_in', 'asc')
                ->value('check_in');

        $startDate = $startDate ? Carbon::parse($startDate)->startOfDay() : now()->startOfDay();
        $endDate   = now()->endOfDay();

        $attendancesFromDb = Attendance::where('student_id', $studentId)
            ->with('shift')
            ->whereBetween('check_in', [$startDate, $endDate])
            ->orderBy('check_in', 'asc')
            ->get()
            ->keyBy(fn($a) => Carbon::parse($a->check_in)->toDateString());

        $attendances = [];
        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate)) {
            $dateString    = $currentDate->toDateString();
            $attendances[] = $attendancesFromDb->has($dateString)
                ? $attendancesFromDb->get($dateString)
                : [
                    'student_id'    => $studentId,
                    'shift_id'      => null,
                    'check_in'      => $currentDate->toDateTimeString(),
                    'check_out'     => null,
                    'status'        => Attendance::ABSENT,
                    'latitude_in'   => null,
                    'longitude_in'  => null,
                    'latitude_out'  => null,
                    'longitude_out' => null,
                    'reason'        => null,
                ];
            $currentDate->addDay();
        }

        return $attendances;
    }

    public function export(Request $request)
    {
        $setting        = GlobalSetting::first();
        $student        = Student::where('user_id', Auth::id())->first();
        $format         = $request->input('format');
        $month_selected = $request->input('month') ?: null;

        if ($format === 'PDF') {
            $attendances = $this->attendanceExport($student->id, $month_selected);
            return Inertia::render('Student/Attendance/Export', [
                'title'          => $student->nis . '_ABSENSI_' . ($month_selected === null ? 'ALL' : strtoupper(substr(Carbon::create()->month(intval($month_selected))->format('F'), 0, 3))),
                'attendances'    => $attendances,
                'setting'        => $setting,
                'month_selected' => $month_selected,
                'student'        => $student,
            ]);
        } elseif ($format === 'XLSX') {
            $attendances = $this->attendanceExport($student->id, $month_selected);
            $monthName   = $month_selected ? date('F Y', mktime(0, 0, 0, $month_selected, 1)) : date('F Y');
            $title       = $month_selected ? "Absensi PKL Bulan $monthName" : "Absensi PKL Keseluruhan";
            return Excel::download(
                new AttendanceExport($title, $attendances, $student),
                $student->nis . '_ABSENSI_' . ($month_selected === null ? 'ALL' : strtoupper(substr(Carbon::create()->month(intval($month_selected))->format('F'), 0, 3))) . '.xlsx'
            );
        }
    }
}