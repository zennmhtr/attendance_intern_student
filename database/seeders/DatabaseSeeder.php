<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    
    public function run(): void
    {
        $this->call([
            GlobalSettingSeed::class,
            DummyUserSeed::class,
            WorkshopSeed::class,
            AttendanceSeed::class,
            JournalSeed::class,
        ]);
    }
}
