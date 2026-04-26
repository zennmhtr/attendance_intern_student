<?php

namespace Database\Seeders;

use App\Models\Shift;
use Illuminate\Database\Seeder;

class ShiftSeed extends Seeder
{
    public function run(): void
    {
        $shifts = [
            // ── HOTEL MERCURE ─────────────────────────────────────────────────
            ['location' => 'HOTEL MERCURE', 'name' => 'SHIFT 1', 'check_in_start' => '05:00', 'check_in_end' => '06:00', 'check_out_start' => '13:00', 'check_out_end' => '14:30'],
            ['location' => 'HOTEL MERCURE', 'name' => 'SHIFT 2', 'check_in_start' => '06:00', 'check_in_end' => '07:00', 'check_out_start' => '14:00', 'check_out_end' => '15:30'],
            ['location' => 'HOTEL MERCURE', 'name' => 'SHIFT 3', 'check_in_start' => '07:00', 'check_in_end' => '08:00', 'check_out_start' => '15:00', 'check_out_end' => '16:30'],
            ['location' => 'HOTEL MERCURE', 'name' => 'SHIFT 4', 'check_in_start' => '10:00', 'check_in_end' => '11:00', 'check_out_start' => '18:00', 'check_out_end' => '19:30'],
            ['location' => 'HOTEL MERCURE', 'name' => 'SHIFT 5', 'check_in_start' => '12:00', 'check_in_end' => '13:00', 'check_out_start' => '20:00', 'check_out_end' => '21:30'],
            ['location' => 'HOTEL MERCURE', 'name' => 'SHIFT 6', 'check_in_start' => '13:00', 'check_in_end' => '14:00', 'check_out_start' => '21:00', 'check_out_end' => '22:30'],
            ['location' => 'HOTEL MERCURE', 'name' => 'SHIFT 7', 'check_in_start' => '14:00', 'check_in_end' => '15:00', 'check_out_start' => '22:00', 'check_out_end' => '23:30'],

            // ── HOTEL QUEST ───────────────────────────────────────────────────
            ['location' => 'HOTEL QUEST', 'name' => 'SHIFT 1', 'check_in_start' => '05:00', 'check_in_end' => '06:00', 'check_out_start' => '13:00', 'check_out_end' => '14:30'],
            ['location' => 'HOTEL QUEST', 'name' => 'SHIFT 2', 'check_in_start' => '10:00', 'check_in_end' => '11:00', 'check_out_start' => '18:00', 'check_out_end' => '19:30'],
            ['location' => 'HOTEL QUEST', 'name' => 'SHIFT 3', 'check_in_start' => '12:00', 'check_in_end' => '13:00', 'check_out_start' => '20:00', 'check_out_end' => '21:30'],
            ['location' => 'HOTEL QUEST', 'name' => 'SHIFT 4', 'check_in_start' => '14:00', 'check_in_end' => '15:00', 'check_out_start' => '22:00', 'check_out_end' => '23:30'],

            // ── HOTEL SANTIKA ─────────────────────────────────────────────────
            // Shift panjang 12 jam: 06:00–18:00
            ['location' => 'HOTEL SANTIKA', 'name' => 'SHIFT 1', 'check_in_start' => '06:00', 'check_in_end' => '07:00', 'check_out_start' => '17:00', 'check_out_end' => '18:30'],

            // ── HOTEL HARRIS ──────────────────────────────────────────────────
            ['location' => 'HOTEL HARRIS', 'name' => 'SHIFT 1', 'check_in_start' => '05:00', 'check_in_end' => '06:00', 'check_out_start' => '14:00', 'check_out_end' => '15:30'],
            ['location' => 'HOTEL HARRIS', 'name' => 'SHIFT 2', 'check_in_start' => '07:00', 'check_in_end' => '08:00', 'check_out_start' => '15:00', 'check_out_end' => '16:30'],
            ['location' => 'HOTEL HARRIS', 'name' => 'SHIFT 3', 'check_in_start' => '12:00', 'check_in_end' => '13:00', 'check_out_start' => '21:00', 'check_out_end' => '22:30'],

            // ── HOTEL SUITES ──────────────────────────────────────────────────
            ['location' => 'HOTEL SUITES', 'name' => 'SHIFT 1', 'check_in_start' => '06:00', 'check_in_end' => '07:00', 'check_out_start' => '14:00', 'check_out_end' => '15:30'],
            ['location' => 'HOTEL SUITES', 'name' => 'SHIFT 2', 'check_in_start' => '12:00', 'check_in_end' => '13:00', 'check_out_start' => '20:00', 'check_out_end' => '21:30'],
            ['location' => 'HOTEL SUITES', 'name' => 'SHIFT 3', 'check_in_start' => '14:00', 'check_in_end' => '15:00', 'check_out_start' => '22:00', 'check_out_end' => '23:30'],
            ['location' => 'HOTEL SUITES', 'name' => 'SHIFT 4', 'check_in_start' => '07:00', 'check_in_end' => '08:00', 'check_out_start' => '15:00', 'check_out_end' => '16:30'],
        ];

        foreach ($shifts as $shift) {
            Shift::firstOrCreate(
                ['location' => $shift['location'], 'name' => $shift['name']],
                array_merge($shift, ['is_active' => true])
            );
        }
    }
}
