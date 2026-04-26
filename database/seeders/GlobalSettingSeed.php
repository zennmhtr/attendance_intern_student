<?php

namespace Database\Seeders;

use App\Models\GlobalSetting;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class GlobalSettingSeed extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        GlobalSetting::create([
            'app_name' => 'Absensi Prakerin',
            'app_icon' => 'assets/img/favicon.png',
            'max_attendance_radius' => 200,
            'default_latitude' => -6.5268489,
            'default_longitude' => 110.9206989,
            'check_in_start' => '10:00',
            'check_in_end' => '12:00',
            'check_out_start' => '18:00',
            'check_out_end' => '21:00',

            // School Identity
            'school_name' => 'SMK Agung Mulia',
            'school_icon' => 'assets/img/school_icon.png',
            'school_address' => 'Jl. Prapatan Parseh I, Sanggra Agung, Kec. Socah, Kab. Bangkalan, Prov. Jawa Timur',
            'school_phone' => '085852159777',
            'school_website' => 'www.smkagungmulia.sch.id',
        ]);
    }
}
