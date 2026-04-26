<?php

namespace App\Http\Middleware;

use App\Models\GlobalSetting;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class CheckSystemActive
{
    public function handle(Request $request, Closure $next, string $type): Response
    {
        $setting = GlobalSetting::first();

        if (!$setting) {
            return $next($request);
        }

        $isActive = match($type) {
            'student'    => $setting->is_student_active,
            'supervisor' => $setting->is_supervisor_active,
            default      => true,
        };

        if (!$isActive) {
            // Jika request Inertia, render halaman error Inertia
            if ($request->header('X-Inertia')) {
                return Inertia::render('Errors/SystemInactive', [
                    'type' => $type,
                    'message' => $type === 'student'
                        ? 'Sistem untuk siswa sedang tidak aktif.'
                        : 'Sistem untuk pembimbing sedang tidak aktif.',
                ])->toResponse($request)->setStatusCode(403);
            }

            // Fallback: abort biasa
            abort(403, $type === 'student'
                ? 'Sistem untuk siswa sedang tidak aktif.'
                : 'Sistem untuk pembimbing sedang tidak aktif.'
            );
        }

        return $next($request);
    }
}