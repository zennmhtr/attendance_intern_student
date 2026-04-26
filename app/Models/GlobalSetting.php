<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GlobalSetting extends Model
{
    protected $guarded = ['id'];
    protected $table = 'global_settings';
    protected $fillable = [
        'app_name',
        'app_icon',
        'default_latitude',
        'default_longitude',
        'max_attendance_radius',
        'check_in_start',
        'check_in_end',
        'check_out_start',
        'check_out_end',
        'school_name',
        'school_icon',
        'school_address',
        'school_phone',
        'school_email',
        'school_website',
        'is_student_active',
        'is_supervisor_active',
    ];
    
    protected $casts = [
        'is_student_active'    => 'boolean',   
        'is_supervisor_active' => 'boolean',   
    ];
}
