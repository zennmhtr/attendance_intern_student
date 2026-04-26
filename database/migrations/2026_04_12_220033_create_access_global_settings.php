<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('global_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('global_settings', 'is_student_active')) {
                $table->boolean('is_student_active')->default(true)->after('school_website');
            }
            if (!Schema::hasColumn('global_settings', 'is_supervisor_active')) {
                $table->boolean('is_supervisor_active')->default(true)->after('is_student_active');
            }
        });
    }

    public function down(): void
    {
        Schema::table('global_settings', function (Blueprint $table) {
            $table->dropColumn(['is_student_active', 'is_supervisor_active']);
        });
    }
};