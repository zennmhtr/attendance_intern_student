<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\GlobalSetting;
use App\Models\Journal;
use App\Models\Shift;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class DashboardController extends Controller
{
    private const SHIFT_MAJORS = ['TBOG', 'TATA BOGA'];
    private function isShiftMajor(Student $student): bool
    {
        return in_array(strtoupper($student->major ?? ''), self::SHIFT_MAJORS);
    }

    private function calculateRadiusGap(
        $lat_attendance, $long_attendance,
        $lat_workshop,   $long_workshop
    ): int {
        $earth_radius = 6371000;
        $dLat = deg2rad($lat_workshop - $lat_attendance);
        $dLon = deg2rad($long_workshop - $long_attendance);
        $a    = sin($dLat / 2) * sin($dLat / 2)
              + cos(deg2rad($lat_attendance))
              * cos(deg2rad($lat_workshop))
              * sin($dLon / 2)
              * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return (int) floor($earth_radius * $c);
    }

    private function resolveProfilePhotoUrl(Student $student): ?string
    {
        if (!$student->profile_photo) return null;
        if (!Storage::disk('public')->exists($student->profile_photo)) return null;
        return Storage::url($student->profile_photo) . '?v=' . time();
    }

    private function getLatestActivity(Student $student): array
    {
        $now        = now()->format('Y-m-d');
        $attendance = Attendance::where('student_id', $student->id)
            ->whereDate('check_in', $now)
            ->with('shift')
            ->first();

        $journal = Journal::where('student_id', $student->id)
            ->whereDate('date', $now)
            ->first();

        if ($attendance && $student->workshop) {
            $attendance->radius_gap_attendance_in = $this->calculateRadiusGap(
                $attendance->latitude_in,  $attendance->longitude_in,
                $student->workshop->latitude, $student->workshop->longitude
            );
            if ($attendance->check_out) {
                $attendance->radius_gap_attendance_out = $this->calculateRadiusGap(
                    $attendance->latitude_out,  $attendance->longitude_out,
                    $student->workshop->latitude, $student->workshop->longitude
                );
            }
        }

        return [
            'attendance' => $attendance,
            'journal'    => $journal,
        ];
    }

    private function getShiftsForStudent(Student $student): array
    {
        $workshopName = strtoupper($student->workshop->name ?? '');

        return Shift::where('is_active', true)
            ->when($workshopName, function ($query) use ($workshopName) {
                $query->where(function ($q) use ($workshopName) {
                    foreach (['MERCURE', 'QUEST', 'SANTIKA', 'HARRIS', 'SUITES'] as $hotel) {
                        if (str_contains($workshopName, $hotel)) {
                            $q->orWhere('location', 'like', "%{$hotel}%");
                        }
                    }
                });
            })
            ->orderBy('check_in_start')
            ->get()
            ->map(fn($s) => [
                'id'              => $s->id,
                'value'           => (string) $s->id,
                'label'           => "{$s->location} — {$s->name} (" . substr($s->check_in_start, 0, 5) . " - " . substr($s->check_out_start, 0, 5) . ")",
                'name'            => $s->name,
                'location'        => $s->location,
                'check_in_start'  => substr($s->check_in_start, 0, 5),
                'check_in_end'    => substr($s->check_in_end, 0, 5),
                'check_out_start' => substr($s->check_out_start, 0, 5),
                'check_out_end'   => substr($s->check_out_end, 0, 5),
            ])
            ->toArray();
    }

    public function index()
    {
        $student = Student::with('workshop')
            ->where('user_id', Auth::id())
            ->first();

        if (!$student) {
            abort(404, 'Data siswa tidak ditemukan');
        }

        $student->profile_photo_url = $this->resolveProfilePhotoUrl($student);

        $setting         = GlobalSetting::first();
        $latest_activity = $this->getLatestActivity($student);
        $isShiftMajor    = $this->isShiftMajor($student);
        $shifts = $isShiftMajor ? $this->getShiftsForStudent($student) : [];
        $settingData = $setting ? array_merge($setting->toArray(), [
            'check_in_start'  => substr($setting->check_in_start,  0, 5),
            'check_in_end'    => substr($setting->check_in_end,    0, 5),
            'check_out_start' => substr($setting->check_out_start, 0, 5),
            'check_out_end'   => substr($setting->check_out_end,   0, 5),
        ]) : $setting;

        return Inertia::render('Student/Dashboard', [
            'title'           => 'Dashboard',
            'student'         => $student,
            'user_role'       => Auth::user()->role,
            'latest_activity' => $latest_activity,
            'setting'         => $settingData,
            'is_shift_major'  => $isShiftMajor,  // true = TBOG
            'shifts'          => $shifts,         // [] jika TKJ/TSM
        ]);
    }
}