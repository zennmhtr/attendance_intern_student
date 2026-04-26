<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->string('name');                 // "SHIFT 1", "SHIFT 2", dst
            $table->string('location');             // "HOTEL MERCURE", "HOTEL QUEST", dst
            $table->time('check_in_start');         // jam mulai bisa absen masuk
            $table->time('check_in_end');           // jam tutup absen masuk
            $table->time('check_out_start');        // jam mulai bisa absen pulang
            $table->time('check_out_end');          // jam tutup absen pulang
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->foreignId('shift_id')
                ->nullable()
                ->after('student_id')
                ->constrained('shifts')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropForeign(['shift_id']);
            $table->dropColumn('shift_id');
        });

        Schema::dropIfExists('shifts');
    }
};