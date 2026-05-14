<?php

namespace App\Services;

class HealthScoreService
{
    /**
     * Calculate health score and badges based on nutrition data
     * 
     * @param array $nutrition
     * @return array ['score' => int, 'badges' => array, 'level' => string]
     */
    public static function calculate(array $nutrition): array
    {
        $kcal = floatval($nutrition['kcal'] ?? 0);
        $protein = floatval($nutrition['protein'] ?? 0);
        $fat = floatval($nutrition['fat'] ?? 0);
        $carbs = floatval($nutrition['carbs'] ?? 0);

        $badges = [];
        $score = 50; // Base score

        // High Protein (>20g)
        if ($protein >= 20) {
            $badges[] = 'High Protein';
            $score += 15;
        }

        // Healthy Choice (Kcal 300-600, Protein >15g)
        if ($kcal >= 300 && $kcal <= 600 && $protein >= 15) {
            $badges[] = 'Healthy Choice';
            $score += 20;
        }

        // Low Fat (<10g)
        if ($fat > 0 && $fat < 10) {
            $badges[] = 'Low Fat';
            $score += 10;
        }

        // Balanced Meal (Good protein ratio)
        if ($kcal > 0) {
            $proteinRatio = ($protein * 4 / $kcal) * 100;
            if ($proteinRatio >= 20 && $proteinRatio <= 35) {
                $badges[] = 'Balanced Meal';
                $score += 15;
            }
        }

        // Energy Boost (High Carbs >50g)
        if ($carbs >= 50) {
            $badges[] = 'Energy Boost';
            $score += 10;
        }

        // Light Meal (Kcal <400)
        if ($kcal > 0 && $kcal < 400) {
            $badges[] = 'Light Meal';
            $score += 5;
        }

        // Determine level
        $score = min($score, 100);
        
        if ($score >= 85) {
            $level = 'excellent';
        } elseif ($score >= 70) {
            $level = 'good';
        } elseif ($score >= 50) {
            $level = 'moderate';
        } else {
            $level = 'low';
        }

        return [
            'score' => $score,
            'badges' => $badges,
            'level' => $level,
        ];
    }
}
