<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboard;
use App\Http\Controllers\Admin\ShiftController as AdminShift;
use App\Http\Controllers\Admin\StudentController as AdminStudent;
use App\Http\Controllers\Admin\SupervisorController as AdminSupervisor;
use App\Http\Controllers\Admin\WorkshopController as AdminWorkshop;
use App\Http\Controllers\Global\AuthController;
use App\Http\Controllers\Global\GlobalController;
use App\Http\Controllers\Global\NotificationController;
use App\Http\Controllers\Student\AttendanceController as StudentAttendance;
use App\Http\Controllers\Student\DashboardController as StudentDashboard;
use App\Http\Controllers\Student\JournalController as StudentJournal;
use App\Http\Controllers\Student\WorkshopController as StudentWorkshop;
use App\Http\Controllers\Supervisor\DashboardController as SupervisorDashboard;
use App\Http\Controllers\Supervisor\StudentController as SupervisorStudent;
use App\Http\Controllers\Supervisor\WorkshopController as SupervisorWorkshop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/storage/students/photos/{filename}', function (Request $request, $filename) {
    $filename = urldecode($filename);
    $path = storage_path('app/public/students/photos/'.$filename);

    if (! file_exists($path)) {
        abort(404);
    }

    $mimeType = mime_content_type($path) ?: 'image/jpeg';

    return response()->file($path, [
        'Content-Type'  => $mimeType,
        'Cache-Control' => 'public, max-age=3600',
    ]);
})->where('filename', '.+');

Route::get('/storage/journal-images/{filename}', function (Request $request, $filename) {
    $filename = urldecode($filename);
    $path = storage_path('app/public/journal-images/'.$filename);

    if (! file_exists($path)) {
        abort(404);
    }

    $mimeType = mime_content_type($path) ?: 'image/jpeg';

    return response()->file($path, [
        'Content-Type'  => $mimeType,
        'Cache-Control' => 'public, max-age=3600',
    ]);
})->where('filename', '.+');

Route::get('/', [AuthController::class, 'SignedInStatus'])->name('login');

Route::prefix('auth')->group(function () {
    Route::get('/signin', [AuthController::class, 'signInView'])
        ->name('auth.signin')
        ->middleware('guest');

    Route::post('/signin', [AuthController::class, 'signIn'])->middleware('guest');
});

Route::middleware('auth')->group(function () {
    Route::post('/firebase/update-fcm-token', [NotificationController::class, 'updateFcmToken']);
    Route::post('/firebase/student-subscribe-reminder', [NotificationController::class, 'studentSubscribeReminder']);
    Route::post('auth/signout', [AuthController::class, 'signOut']);

    Route::post('/upload/image', function (Request $request) {
        $request->validate([
            'image' => 'required|image|max:2048',
        ]);

        $path = $request->file('image')->store('journal-images', 'public');

        return response()->json([
            'url' => Storage::url($path),
        ]);
    });

    // ── Global Profile ────────────────────────────────────────────────────────
    Route::prefix('/profile')
        ->controller(GlobalController::class)
        ->group(function () {
            Route::get('/',                    'showProfile');
            Route::put('/update',              'updateProfile');
            Route::get('/change-password',     'showChangePassword');
            Route::post('/change-password/check', 'checkPassword');
            Route::put('/change-password',     'updatePassword');
        });

    // ── Admin ─────────────────────────────────────────────────────────────────
    Route::prefix('admin')->group(function () {

        // Dashboard & App Setting
        Route::get('/dashboard',                    [AdminDashboard::class, 'index']);
        Route::get('/app-setting',                  [AdminDashboard::class, 'appSetting']);
        Route::post('/app-setting/update',          [AdminDashboard::class, 'updateAppSetting']);
        Route::post('/app-setting/toggle-system',   [AdminDashboard::class, 'toggleSystem']);
        Route::get('/app-setting/system-status',    [AdminDashboard::class, 'getSystemStatus']);

        // Shift TBOG
        Route::get('/shift',                        [AdminShift::class, 'index'])->name('admin.shift.index');
        Route::post('/shift',                       [AdminShift::class, 'store'])->name('admin.shift.store');
        Route::put('/shift/{shift}',                [AdminShift::class, 'update'])->name('admin.shift.update');
        Route::delete('/shift/{shift}',             [AdminShift::class, 'destroy'])->name('admin.shift.destroy');
        Route::post('/shift/{shift}/toggle',        [AdminShift::class, 'toggleActive'])->name('admin.shift.toggle');

        // Student
        Route::prefix('/student')
            ->controller(AdminStudent::class)
            ->group(function () {
                Route::get('/',            'index');
                Route::get('/create',      'create');
                Route::post('/',           'store');
                Route::post('/import',     'import');
                Route::get('/{id}',        'show');
                Route::get('/{id}/edit',   'edit');
                Route::post('/{id}',       'update');
                Route::delete('/{id}',     'destroy');
            });

        // Workshop
        Route::prefix('/workshop')
            ->controller(AdminWorkshop::class)
            ->name('admin.workshop.')
            ->group(function () {
                Route::get('/',            'index')->name('index');
                Route::get('/create',      'create')->name('create');
                Route::get('/{id}',        'show')->name('show');
                Route::get('/{id}/edit',   'edit')->name('edit');
                Route::post('/',           'store')->name('store');
                Route::post('/import',     'import')->name('import');
                Route::put('/{id}',        'update')->name('update');
                Route::delete('/{id}',     'destroy')->name('destroy');
            });

        // Supervisor
        Route::prefix('/supervisor')
            ->controller(AdminSupervisor::class)
            ->group(function () {
                Route::get('/',            'index');
                Route::get('/create',      'create');
                Route::get('/{id}',        'show');
                Route::get('/{id}/edit',   'edit');
                Route::post('/',           'store');
                Route::post('/import',     'import');
                Route::put('/{id}',        'update');
                Route::delete('/{id}',     'destroy');
            });
    });

    // ── Student ───────────────────────────────────────────────────────────────
    Route::middleware('system.active:student')->prefix('student')->group(function () {
        Route::get('/dashboard', [StudentDashboard::class, 'index']);

        Route::prefix('/attendance')
            ->controller(StudentAttendance::class)
            ->group(function () {
                Route::get('/',        'index');
                Route::get('/create',  'create');
                Route::get('/export',  'export');
                Route::get('/{id}',    'show');
                Route::post('/',       'store');
            });

        Route::prefix('/journal')
            ->controller(StudentJournal::class)
            ->group(function () {
                Route::get('/',        'index');
                Route::get('/create',  'create');
                Route::get('/export',  'export');
                Route::get('/{id}',    'show');
                Route::get('/{id}/edit', 'edit');
                Route::post('/',       'store');
                Route::put('/{id}',    'update');
                Route::delete('/{id}', 'destroy');
            });

        Route::prefix('/workshop')
            ->controller(StudentWorkshop::class)
            ->group(function () {
                Route::get('/', 'index');
            });
    });

    // ── Supervisor ────────────────────────────────────────────────────────────
    Route::middleware('system.active:supervisor')->prefix('supervisor')->group(function () {
        Route::get('/dashboard', [SupervisorDashboard::class, 'index']);

        Route::prefix('/student')
            ->controller(SupervisorStudent::class)
            ->group(function () {
                Route::get('/', 'index');

                Route::prefix('/attendance')->group(function () {
                    Route::get('/',        'attendanceList');
                    Route::get('/export',  'attendanceExport');
                    Route::get('/{id}',    'attendanceDetail');
                });

                Route::prefix('/journal')->group(function () {
                    Route::get('/',     'journalList');
                    Route::get('/{id}', 'journalDetail');
                });

                Route::get('/{id}', 'show');
            });

        Route::prefix('/workshop')
            ->controller(SupervisorWorkshop::class)
            ->group(function () {
                Route::get('/',     'index');
                Route::get('/{id}', 'show');
            });
    });
});