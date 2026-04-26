<?php

namespace Database\Seeders;

use App\Models\Supervisor;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DummyUserSeed extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'username' => 'admin',
            'password' => bcrypt('admin123'),
            'role' => 'ADMIN',
        ]);

        // SPV 1
        User::create([
            'username' => '111111',
            'password' => bcrypt('12345'),
            'role' => 'SUPERVISOR',
            'email' => 'jakfarshidik@gmail.com'
        ]);

        Supervisor::create([
            "user_id" => 2,
            "full_name" => "Jakfar Shidik ",
            "nip" => "111111",
        ]);

        // SPV 2
        User::create([
            'username' => '222222',
            'password' => bcrypt('12345'),
            'role' => 'SUPERVISOR',
            'email' => 'hariyanto@gmail.com'
        ]);

        Supervisor::create([
            "user_id" => 3,
            "full_name" => "Hariyanto",
            "nip" => "222222",
        ]);

        // SPV 3
        User::create([
            'username' => '333333',
            'password' => bcrypt('12345'),
            'role' => 'SUPERVISOR',
            'email' => 'hotib@gmail.com'
        ]);

        Supervisor::create([
            "user_id" => 4,
            "full_name" => "Hotib",
            "nip" => "333333",
        ]);

        // SPV 4
        User::create([
            'username' => '444444',
            'password' => bcrypt('12345'),
            'role' => 'SUPERVISOR',
            'email' => 'faisol@gmail.com'
        ]);

        Supervisor::create([
            "user_id" => 5,
            "full_name" => "Faisol",
            "nip" => "444444",
        ]);

        // SPV 5
        User::create([
            'username' => '555555',
            'password' => bcrypt('12345'),
            'role' => 'SUPERVISOR',
            'email' => 'fauzi@gmail.com'
        ]);

        Supervisor::create([
            "user_id" => 6,
            "full_name" => "Fauzi",
            "nip" => "555555",
        ]);

        // SPV 6
        User::create([
            'username' => '666666',
            'password' => bcrypt('12345'),
            'role' => 'SUPERVISOR',
            'email' => 'Toyyibaturrohmah@gmail.com'
        ]);

        Supervisor::create([
            "user_id" => 7,
            "full_name" => "Toyyibatur Rohmah",
            "nip" => "666666",
        ]);

        // SPV 7
        User::create([
            'username' => '777777',
            'password' => bcrypt('12345'),
            'role' => 'SUPERVISOR',
            'email' => 'nuraini@gmail.com'
        ]);

        Supervisor::create([
            "user_id" => 8,
            "full_name" => "Nur Aini",
            "nip" => "777777",
        ]);

        // SPV 8
        User::create([
            'username' => '888888',
            'password' => bcrypt('12345'),
            'role' => 'SUPERVISOR',
            'email' => 'ismawati@gmail.com'
        ]);

        Supervisor::create([
            "user_id" => 9,
            "full_name" => "Ismawati",
            "nip" => "888888",
        ]);
        
        // STD 1
        User::create([
            'username' => '312110484',
            'password' => bcrypt('student123'),
            'role' => 'STUDENT',
            'email' => 'student1@gmail.com'
        ]);

        // STD 2
        User::create([
            'username' => '312110294',
            'password' => bcrypt('student1234'),
            'role' => 'STUDENT',
            'email' => 'student2@gmail.com'
        ]);
        
        // STD 3
        User::create([
            'username' => '312110485',
            'password' => bcrypt('student12345'),
            'role' => 'STUDENT',
            'email' => 'student3@gmail.com'
        ]);
    }
}
