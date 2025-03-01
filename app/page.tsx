'use client';
import { useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
} from 'chart.js';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

// Register Chart.js components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  ChartTooltip, 
  ChartLegend,
  Filler
);

// Dynamic import to avoid SSR issues
const LineChart = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), { ssr: false });

// Define types
interface WeightRecord {
  id: number;
  date: string;
  bmi: number;
  weight: number;
  bodyFat: number;
  visceralFat: number;
  waterRate: number;
  muscleMass: number;
  boneMineral: number;
  bmr: number;
}

interface Consultation {
  id: number | null;
  consultationDate: string;
  preConsultation: string;
  postConsultation: string;
  consultationType: string;
}

interface FiveTypeRecord {
  subject: string;
  score: number;
  color?: string;
}

interface HistoricalFiveTypeRecord {
  date: string;
  [key: string]: string | number;
}

interface AnalysisResult {
  startDate: string;
  endDate: string;
  daysBetween: number;
  startWeight: number;
  endWeight: number;
  weightChange: number;
  startBodyFat: number;
  endBodyFat: number;
  bodyFatChange: number;
  averageWeightLossPerWeek: number;
  // Additional analysis metrics
  bmiChange: number;
  visceralFatChange: number;
  muscleMassChange: number;
  weightLossRate: number; // percentage of initial weight
  bodyFatLossRate: number; // percentage of initial body fat
  successRate: number; // calculated based on overall improvements
}

interface DateRange {
  startDate: string;
  type: string;
  days: number;
}

interface CardProps {
  title?: string | ReactNode;
  children: ReactNode;
  className?: string;
}

interface MemberInfoCardProps {
  fiveTypeData: FiveTypeRecord[];
  historicalFiveTypeData: HistoricalFiveTypeRecord[];
}

interface DataAnalysisCardProps {
  weightRecords: WeightRecord[];
  dateRange: DateRange;
  onDateRangeChange: (newRange: any) => void;
}

interface ProgressIndicatorProps {
  label: string;
  value: number;
  targetValue: number;
  color: string;
  unit?: string;
  reverse?: boolean;
}

interface TabNavigationProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

interface DateFilterButtonProps {
  days: number;
  label: string;
  currentStartDate: string;
  onClick: (days: number) => void;
}

// Theme colors with dark mode support
const theme = {
  light: {
    primary: '#007BFF',
    secondary: '#6C757D',
    success: '#28A745',
    danger: '#DC3545',
    warning: '#FFC107',
    info: '#17A2B8',
    light: '#F8F9FA',
    dark: '#343A40',
    muted: '#6c757d',
    border: '#dee2e6',
    cardBackground: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.1)',
    chartColors: [
      'rgba(54, 162, 235, 0.6)',
      'rgba(255, 206, 86, 0.6)',
      'rgba(75, 192, 192, 0.6)',
      'rgba(153, 102, 255, 0.6)',
      'rgba(255, 159, 64, 0.6)',
      'rgba(255, 99, 132, 0.6)',
      'rgba(45, 120, 190, 0.6)',
      'rgba(95, 180, 90, 0.6)',
      'rgba(220, 95, 95, 0.6)',
    ],
  },
  dark: {
    primary: '#0D6EFD',
    secondary: '#6C757D',
    success: '#198754',
    danger: '#DC3545',
    warning: '#FFC107',
    info: '#0DCAF0',
    light: '#F8F9FA',
    dark: '#212529',
    muted: '#6c757d',
    border: '#495057',
    cardBackground: '#343A40',
    shadow: 'rgba(0, 0, 0, 0.3)',
    chartColors: [
      'rgba(84, 192, 255, 0.6)',
      'rgba(255, 226, 106, 0.6)',
      'rgba(95, 212, 212, 0.6)',
      'rgba(173, 122, 255, 0.6)',
      'rgba(255, 179, 84, 0.6)',
      'rgba(255, 119, 152, 0.6)',
      'rgba(65, 140, 210, 0.6)',
      'rgba(115, 200, 110, 0.6)',
      'rgba(240, 115, 115, 0.6)',
    ],
  },
};

// Component for reusable styled cards
const Card = ({ title, children, className = '' }: CardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const colors = theme.light;
  
  const cardStyle = {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: '10px',
    padding: '20px',
    backgroundColor: colors.cardBackground,
    boxShadow: isHovered ? `0 6px 12px ${colors.shadow}` : `0 4px 8px ${colors.shadow}`,
    marginBottom: '20px',
    transition: 'box-shadow 0.3s ease-in-out',
  } as React.CSSProperties;
  
  const titleStyle = {
    textAlign: 'center',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: `3px solid ${colors.primary}`,
    color: colors.primary,
    fontSize: '1.5rem',
    fontWeight: 'bold',
  } as React.CSSProperties;
  
  return (
    <div 
      style={cardStyle} 
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {title && <h2 style={titleStyle}>{title}</h2>}
      {children}
    </div>
  );
};

// Component for member information
const MemberInfoCard = ({ fiveTypeData, historicalFiveTypeData }: MemberInfoCardProps) => {
  const [fiveTypeView, setFiveTypeView] = useState<'current' | 'historical'>('current');
  const colors = theme.light;
  
  // Enhanced five type data with colors
  const enhancedFiveTypeData = useMemo(() => {
    return fiveTypeData.map((item, index) => ({
      ...item,
      color: colors.chartColors[index % colors.chartColors.length],
    }));
  }, [fiveTypeData, colors.chartColors]);

  // Chart options for the five type history line chart
  const lineChartFiveTypeData = {
    labels: historicalFiveTypeData.map((item) => item.date),
    datasets: Object.keys(historicalFiveTypeData[0])
      .filter(key => key !== 'date')
      .map((key, index) => ({
        label: key,
        data: historicalFiveTypeData.map((item) => item[key]),
        borderColor: colors.chartColors[index % colors.chartColors.length],
        backgroundColor: colors.chartColors[index % colors.chartColors.length].replace('0.6', '0.1'),
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      })),
  };
  
  const buttonStyle = {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primary,
    padding: '10px 20px',
    cursor: 'pointer',
    backgroundColor: colors.primary,
    color: 'white',
    borderRadius: '25px',
    margin: '0 5px',
    transition: 'background-color 0.3s ease, color 0.3s ease',
    fontSize: '1rem',
    border: 'none',
    outline: 'none',
  } as React.CSSProperties;
  
  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: '1rem',
  } as React.CSSProperties;
  
  return (
    <Card title="會員資訊卡片">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ flex: '1 1 100%', marginBottom: '8px' }}>
          <strong>五型檢測日期：</strong>2024/12/30
        </div>
        
        <div style={{ flex: '1 1 50%', marginBottom: '8px' }}>
          <strong>姓名：</strong>張大名
        </div>
        
        <div style={{ flex: '1 1 50%', marginBottom: '8px' }}>
          <strong>店名：</strong>台中京都堂
        </div>
        
        <div style={{ flex: '1 1 50%', marginBottom: '8px' }}>
          <strong>病歷號碼：</strong>J000000X
        </div>
        
        <div style={{ flex: '1 1 50%', marginBottom: '8px' }}>
          <strong>性別：</strong>男
        </div>
        
        <div style={{ flex: '1 1 50%', marginBottom: '8px' }}>
          <strong>手機號碼：</strong>0900000000
        </div>
        
        <div style={{ flex: '1 1 50%', marginBottom: '8px' }}>
          <strong>生日：</strong>1990/01/01
        </div>
        
        <div style={{ flex: '1 1 50%', marginBottom: '8px' }}>
          <strong>年齡：</strong>35
        </div>
        
        <div style={{ flex: '1 1 100%', marginBottom: '8px' }}>
          <strong>身高：</strong>167 cm
        </div>
      </div>

      {/* Five Type Data Section */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '15px' 
        }}>
          <h3 style={{ 
            margin: 0, 
            color: colors.primary, 
            fontSize: '1.25rem',
            borderLeft: `4px solid ${colors.primary}`,
            paddingLeft: '10px'
          }}>
            五型體質
          </h3>
          <button 
            onClick={() => setFiveTypeView(fiveTypeView === 'current' ? 'historical' : 'current')}
            style={buttonStyle}
          >
            {fiveTypeView === 'current' ? '查看歷史數據' : '查看當前數據'}
          </button>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'flex-start',
        }}>
          {/* Left: Text Data */}
          <div style={{ flex: '1 1 300px' }}>
            {fiveTypeView === 'current' ? (
              <div style={{ 
                background: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '8px',
                boxShadow: 'inset 0 0 5px rgba(0,0,0,0.1)'
              }}>
                {enhancedFiveTypeData.map((item, index) => (
                  <div key={index} style={labelStyle}>
                    <div style={{ 
                      width: '15px', 
                      height: '15px', 
                      backgroundColor: item.color,
                      borderRadius: '50%',
                      marginRight: '10px'
                    }}></div>
                    <div style={{ flex: 1 }}>{item.subject}</div>
                    <div style={{ 
                      fontWeight: 'bold',
                      backgroundColor: colors.light,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      minWidth: '30px',
                      textAlign: 'center'
                    }}>
                      {item.score}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                maxHeight: '250px', 
                overflowY: 'auto',
                padding: '5px'
              }}>
                {historicalFiveTypeData.map((record, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: '15px',
                      backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#ffffff',
                      padding: '10px',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{
                      fontWeight: 'bold',
                      borderBottom: '1px solid #dee2e6',
                      paddingBottom: '5px',
                      marginBottom: '10px'
                    }}>
                      {record.date}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                      {Object.entries(record)
                        .filter(([key]) => key !== 'date')
                        .map(([key, value], i) => (
                          <div key={i} style={{ flex: '1 0 50%', padding: '3px 0' }}>
                            <span style={{ 
                              display: 'inline-block',
                              width: '12px',
                              height: '12px',
                              backgroundColor: colors.chartColors[i % colors.chartColors.length],
                              borderRadius: '50%',
                              marginRight: '8px'
                            }}></span>
                            {key}: <strong>{value}</strong>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Right: Chart Visualization */}
          <div style={{ flex: '1 1 300px' }}>
            {fiveTypeView === 'current' ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={enhancedFiveTypeData}>
                  <PolarGrid stroke={colors.border} />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: colors.dark, fontSize: 12 }} 
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 6]} 
                    tick={{ fill: colors.dark, fontSize: 12 }} 
                  />
                  <Radar 
                    name="體質分數" 
                    dataKey="score" 
                    stroke={colors.primary} 
                    fill={colors.primary} 
                    fillOpacity={0.6} 
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      padding: '10px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }}
                    labelFormatter={(value) => `${value} 體質評分`}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 280 }}>
                <LineChart
                  data={lineChartFiveTypeData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: { 
                          font: { size: 12 },
                          usePointStyle: true,
                          padding: 15,
                        }
                      },
                      title: { 
                        display: true, 
                        text: '五型體質歷史數據趨勢', 
                        font: { size: 16, weight: 'bold' },
                        padding: { bottom: 15 }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        titleColor: colors.dark,
                        bodyColor: colors.dark,
                        titleFont: { weight: 'bold' },
                        bodyFont: { size: 13 },
                        padding: 10,
                        cornerRadius: 6,
                        borderColor: colors.border,
                        borderWidth: 1,
                        caretSize: 8,
                        displayColors: true,
                      }
                    },
                    scales: {
                      y: { 
                        beginAtZero: true,
                        suggestedMax: 6,
                        ticks: { font: { size: 12 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                      },
                      x: { 
                        ticks: { font: { size: 12 } },
                        grid: { display: false }
                      }
                    },
                    elements: {
                      line: { tension: 0.4 },
                      point: { radius: 4, hoverRadius: 6 }
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Data analysis component with enhanced insights
const DataAnalysisCard = ({ weightRecords, dateRange, onDateRangeChange }: DataAnalysisCardProps) => {
  const colors = theme.light;
  
  // Progress indicator component for showing changes
  const ProgressIndicator = ({ label, value, targetValue, color, unit = '', reverse = false }: ProgressIndicatorProps) => {
    const percentage = targetValue ? (value / targetValue) * 100 : 0;
    const isPositive = reverse ? value <= 0 : value >= 0;
    
    return (
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>{label}</span>
          <span style={{ 
            fontWeight: 'bold',
            color: isPositive ? colors.success : colors.danger
          }}>
            {value > 0 ? '+' : ''}{value}{unit}
          </span>
        </div>
        <div style={{ 
          height: '8px', 
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${Math.min(Math.abs(percentage), 100)}%`,
            height: '100%',
            backgroundColor: isPositive ? color : colors.danger,
            borderRadius: '4px',
            transition: 'width 0.5s ease-in-out'
          }}></div>
        </div>
      </div>
    );
  };
  
  // Calculate enhanced analysis statistics
  const analysisResults = useMemo(() => {
    if (weightRecords.length === 0) return null;
    
    const sortedRecords = [...weightRecords].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Filter based on date range if provided
    const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
    
    const filteredRecords = startDate 
      ? sortedRecords.filter(record => new Date(record.date) >= startDate)
      : sortedRecords;
    
    if (filteredRecords.length === 0) return null;
    
    const firstRecord = filteredRecords[0];
    const lastRecord = filteredRecords[filteredRecords.length - 1];
    
    // Calculate days between
    const daysBetween = Math.floor(
      (new Date(lastRecord.date).getTime() - new Date(firstRecord.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Calculate weekly weight loss rate
    const weeksBetween = daysBetween / 7 || 1; // prevent division by zero
    const weeklyWeightLoss = (firstRecord.weight - lastRecord.weight) / weeksBetween;
    
    // Calculate body composition changes
    const fatMassStart = (firstRecord.weight * firstRecord.bodyFat) / 100;
    const fatMassEnd = (lastRecord.weight * lastRecord.bodyFat) / 100;
    const fatMassLost = fatMassStart - fatMassEnd;
    
    // Calculate lean mass changes
    const leanMassStart = firstRecord.weight - fatMassStart;
    const leanMassEnd = lastRecord.weight - fatMassEnd;
    const leanMassChange = leanMassEnd - leanMassStart;
    
    // Success metrics based on healthy targets
    // Healthy weekly weight loss: 0.5-1kg
    // Healthy body fat targets depend on gender but we'll use general metrics
    const idealWeeklyLoss = weeklyWeightLoss >= 0.5 && weeklyWeightLoss <= 1;
    const goodBodyFatLoss = fatMassLost > 0;
    const preservedMuscle = leanMassChange >= 0;
    
    // Calculate overall success score (simplified)
    const successRate = [
      idealWeeklyLoss ? 33.3 : Math.max(0, 33.3 - Math.abs(weeklyWeightLoss - 0.75) * 10),
      goodBodyFatLoss ? 33.3 : 0,
      preservedMuscle ? 33.4 : 0
    ].reduce((sum, val) => sum + val, 0);
    
    return {
      startDate: firstRecord.date,
      endDate: lastRecord.date,
      daysBetween,
      startWeight: firstRecord.weight,
      endWeight: lastRecord.weight,
      weightChange: +(firstRecord.weight - lastRecord.weight).toFixed(1),
      startBodyFat: firstRecord.bodyFat,
      endBodyFat: lastRecord.bodyFat,
      bodyFatChange: +(firstRecord.bodyFat - lastRecord.bodyFat).toFixed(1),
      averageWeightLossPerWeek: +weeklyWeightLoss.toFixed(2),
      bmiChange: +(firstRecord.bmi - lastRecord.bmi).toFixed(1),
      visceralFatChange: firstRecord.visceralFat - lastRecord.visceralFat,
      muscleMassChange: +(lastRecord.muscleMass - firstRecord.muscleMass).toFixed(1),
      fatMassLost: +fatMassLost.toFixed(1),
      leanMassChange: +leanMassChange.toFixed(1),
      waterRateChange: +(lastRecord.waterRate - firstRecord.waterRate).toFixed(1),
      weightLossRate: +((firstRecord.weight - lastRecord.weight) / firstRecord.weight * 100).toFixed(1),
      bodyFatLossRate: +((firstRecord.bodyFat - lastRecord.bodyFat) / firstRecord.bodyFat * 100).toFixed(1),
      successRate: +successRate.toFixed(1),
    };
  }, [weightRecords, dateRange]);
  
  // Chart data for main analysis chart
  const analysisChartData = useMemo(() => {
    if (!analysisResults) return { labels: [], datasets: [] };
    
    return {
      labels: ['開始', '結束'],
      datasets: [
        {
          label: '體重 (kg)',
          data: [analysisResults.startWeight, analysisResults.endWeight],
          borderColor: colors.info,
          backgroundColor: 'rgba(23, 162, 184, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 9,
          borderWidth: 3,
        },
        {
          label: '體脂肪率 (%)',
          data: [analysisResults.startBodyFat, analysisResults.endBodyFat],
          borderColor: colors.warning,
          backgroundColor: 'rgba(255, 193, 7, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 9,
          borderWidth: 3,
        },
        {
          label: '體脂肪量 (kg)',
          data: [
            analysisResults.startWeight * analysisResults.startBodyFat / 100,
            analysisResults.endWeight * analysisResults.endBodyFat / 100
          ],
          borderColor: colors.danger,
          backgroundColor: 'rgba(220, 53, 69, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 9,
          borderWidth: 3,
        },
        {
          label: '肌肉量 (kg)',
          data: [
            analysisResults.startWeight - (analysisResults.startWeight * analysisResults.startBodyFat / 100),
            analysisResults.endWeight - (analysisResults.endWeight * analysisResults.endBodyFat / 100)
          ],
          borderColor: colors.success,
          backgroundColor: 'rgba(40, 167, 69, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 9,
          borderWidth: 3,
        }
      ],
    };
  }, [analysisResults, colors]);
  
  // Enhanced chart options
  const analysisChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 14, weight: 'bold' as const },
          usePointStyle: true,
          padding: 20,
        },
      },
      title: { 
        display: true, 
        text: '體重與體組成變化分析', 
        font: { size: 18, weight: 'bold' as const },
        padding: { bottom: 20 },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: colors.dark,
        bodyColor: colors.dark,
        titleFont: { weight: 'bold' as const },
        bodyFont: { size: 14 },
        padding: 12,
        cornerRadius: 6,
        borderColor: colors.border,
        borderWidth: 1,
        displayColors: true,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0,0,0,0.05)',
          borderDash: [5, 5],
        },
        ticks: {
          font: { size: 14 },
          padding: 10,
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 14, weight: 'bold' as const },
          padding: 10,
        },
      },
    },
    layout: {
      padding: {
        top: 10,
        right: 20,
        bottom: 10,
        left: 20
      }
    },
    elements: {
      line: { tension: 0.4 },
      point: { 
        radius: 6, 
        hoverRadius: 9,
        borderWidth: 3,
        hoverBorderWidth: 4,
      }
    }
  };
  
  // Button component for date filtering
  const DateFilterButton = ({ days, label, currentStartDate, onClick }: DateFilterButtonProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    
    const isActive = currentStartDate === days.toString();
    
    const style = {
      padding: '10px 16px',
      borderRadius: '20px',
      marginRight: '8px',
      marginBottom: '10px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: isActive ? '600' : 'normal',
      backgroundColor: isActive ? colors.primary : (isHovered ? colors.light : '#f0f0f0'),
      color: isActive ? '#fff' : (isHovered ? colors.primary : colors.dark),
      transition: 'all 0.2s ease',
      boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.15)' : 'none',
      transform: isPressed ? 'scale(0.97)' : (isActive ? 'scale(1.03)' : 'scale(1)'),
      position: 'relative',
      overflow: 'hidden',
      zIndex: 1,
    } as React.CSSProperties;
    return (
      <button
        style={style}
        onClick={() => onClick(days)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
      >
        {label}
        {isActive && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '3px',
            backgroundColor: '#fff',
            zIndex: 2,
          }}></div>
        )}
      </button>
    );
  };
  
  // Custom date filter input for precise date selection
  const [customDate, setCustomDate] = useState('');
  const [customDays, setCustomDays] = useState('');
  
  return (
    <Card title="減重數據分析">
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ 
          margin: '0 0 15px 0',
          fontSize: '1.1rem',
          color: colors.dark
        }}>
          分析時間範圍
        </h3>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '15px' }}>
          {[
            { days: 7, label: '7天' },
            { days: 14, label: '14天' },
            { days: 30, label: '30天' },
            { days: 60, label: '60天' },
            { days: 90, label: '90天' },
            { days: 180, label: '半年' },
            { days: 365, label: '一年' },
          ].map((option) => (
            <DateFilterButton
              key={option.days}
              days={option.days}
              label={option.label}
              currentStartDate={dateRange.days === option.days ? option.days.toString() : ''}
              onClick={(days) => {
                const today = new Date();
                const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
                onDateRangeChange({
                  startDate: startDate.toISOString().split('T')[0],
                  type: 'days',
                  days
                });
              }}
            />
          ))}
        </div>
        
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.05)',
          marginBottom: '20px'
        }}>
          <div style={{
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '12px',
            marginBottom: '15px'
          }}>
            <h4 style={{
              margin: '0 0 10px 0',
              fontSize: '1rem',
              color: colors.dark,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#495057" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              自訂查詢時間範圍
            </h4>
            <p style={{
              margin: '0',
              fontSize: '0.85rem',
              color: '#6c757d'
            }}>
              選擇一種方式設定時間範圍：使用起始日期或設定時間區間天數
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px'
          }}>
            {/* 起始日期選擇區塊 */}
            <div style={{
              flex: '1 1 300px',
              backgroundColor: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e6e6e6'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px',
                gap: '6px'
              }}>
                <div style={{
                  backgroundColor: colors.primary,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>1</div>
                <label htmlFor="customDateInput" style={{ 
                  fontWeight: '500',
                  color: '#495057'
                }}>
                  選擇起始日期
                </label>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}>
                <input
                  id="customDateInput"
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ced4da',
                    fontSize: '0.9rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    flex: '1',
                    minWidth: '180px'
                  }}
                />
                
                <button
                  onClick={() => {
                    if (customDate) {
                      onDateRangeChange({
                        startDate: customDate,
                        type: 'custom'
                      });
                      setCustomDays('');
                    }
                  }}
                  disabled={!customDate}
                  style={{
                    padding: '10px',
                    backgroundColor: customDate ? colors.primary : '#e9ecef',
                    color: customDate ? 'white' : '#6c757d',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: customDate ? 'pointer' : 'not-allowed',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    if (customDate) {
                      e.currentTarget.style.backgroundColor = '#0069d9';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (customDate) {
                      e.currentTarget.style.backgroundColor = colors.primary;
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 10 4 15 9 20"></polyline>
                    <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* 天數選擇區塊 */}
            <div style={{
              flex: '1 1 300px',
              backgroundColor: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e6e6e6'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px',
                gap: '6px'
              }}>
                <div style={{
                  backgroundColor: colors.primary,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>2</div>
                <label htmlFor="customDaysInput" style={{ 
                  fontWeight: '500',
                  color: '#495057'
                }}>
                  設定時間區間 (天數)
                </label>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}>
                <input
                  id="customDaysInput"
                  type="range"
                  min="1"
                  max="365"
                  value={customDays || "30"}
                  onChange={(e) => setCustomDays(e.target.value)}
                  style={{
                    flex: '1',
                    accentColor: colors.primary
                  }}
                />
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="天數"
                    style={{
                      width: '70px',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ced4da',
                      fontSize: '0.9rem',
                      textAlign: 'center'
                    }}
                  />
                  
                  <button
                    onClick={() => {
                      if (customDays && !isNaN(parseInt(customDays))) {
                        const days = parseInt(customDays);
                        const today = new Date();
                        const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
                        onDateRangeChange({
                          startDate: startDate.toISOString().split('T')[0],
                          type: 'days',
                          days
                        });
                        setCustomDate('');
                      }
                    }}
                    disabled={!customDays || isNaN(parseInt(customDays))}
                    style={{
                      padding: '10px',
                      backgroundColor: customDays && !isNaN(parseInt(customDays)) ? colors.primary : '#e9ecef',
                      color: customDays && !isNaN(parseInt(customDays)) ? 'white' : '#6c757d',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: customDays && !isNaN(parseInt(customDays)) ? 'pointer' : 'not-allowed',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseOver={(e) => {
                      if (customDays && !isNaN(parseInt(customDays))) {
                        e.currentTarget.style.backgroundColor = '#0069d9';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (customDays && !isNaN(parseInt(customDays))) {
                        e.currentTarget.style.backgroundColor = colors.primary;
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 10 4 15 9 20"></polyline>
                      <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div style={{
                marginTop: '10px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px'
              }}>
                {[7, 14, 30, 60, 90].map(day => (
                  <button
                    key={day}
                    onClick={() => {
                      setCustomDays(day.toString());
                      const today = new Date();
                      const startDate = new Date(today.getTime() - day * 24 * 60 * 60 * 1000);
                      onDateRangeChange({
                        startDate: startDate.toISOString().split('T')[0],
                        type: 'days',
                        days: day
                      });
                      setCustomDate('');
                    }}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: dateRange.days === day ? colors.primary : '#e9ecef',
                      color: dateRange.days === day ? 'white' : '#495057',
                      border: 'none',
                      borderRadius: '15px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      if (dateRange.days !== day) {
                        e.currentTarget.style.backgroundColor = '#dee2e6';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (dateRange.days !== day) {
                        e.currentTarget.style.backgroundColor = '#e9ecef';
                      }
                    }}
                  >
                    {day}天
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div style={{
            marginTop: '15px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => {
                onDateRangeChange({
                  startDate: '',
                  type: 'all',
                  days: 0
                });
                setCustomDate('');
                setCustomDays('');
              }}
              style={{
                padding: '8px 15px',
                backgroundColor: '#f0f0f0',
                color: colors.dark,
                border: '1px solid #ced4da',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e2e6ea';
                e.currentTarget.style.borderColor = '#dae0e5';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.borderColor = '#ced4da';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              重置所有篩選條件
            </button>
          </div>
        </div>
      </div>
      
      {analysisResults ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          {/* Left side: Metrics and indicators */}
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ 
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
                fontSize: '1.1rem',
                borderBottom: '1px solid #dee2e6',
                paddingBottom: '10px',
                marginTop: 0,
                marginBottom: '15px',
                color: colors.primary
              }}>
                基本分析資訊
              </h3>
              
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>分析開始日期</span>
                  <span style={{ fontWeight: 'bold' }}>{analysisResults.startDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>分析結束日期</span>
                  <span style={{ fontWeight: 'bold' }}>{analysisResults.endDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>間隔天數</span>
                  <span style={{ fontWeight: 'bold' }}>{analysisResults.daysBetween} 天</span>
                </div>
              </div>
              
              <h3 style={{ 
                fontSize: '1.1rem',
                borderBottom: '1px solid #dee2e6',
                paddingBottom: '10px',
                marginTop: '25px',
                marginBottom: '15px',
                color: colors.primary
              }}>
                體重數據變化
              </h3>
              
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>初始體重</span>
                  <span style={{ fontWeight: 'bold' }}>{analysisResults.startWeight} kg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>最終體重</span>
                  <span style={{ fontWeight: 'bold' }}>{analysisResults.endWeight} kg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>體重變化</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    color: analysisResults.weightChange > 0 ? colors.danger : colors.success
                  }}>
                    {analysisResults.weightChange > 0 ? '+' : ''}{analysisResults.weightChange} kg
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>體重減少百分比</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    color: analysisResults.weightLossRate > 0 ? colors.success : colors.danger
                  }}>
                    {analysisResults.weightLossRate > 0 ? '' : '-'}{Math.abs(analysisResults.weightLossRate)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>平均每週減重</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    color: analysisResults.averageWeightLossPerWeek >= 0.5 && analysisResults.averageWeightLossPerWeek <= 1 
                      ? colors.success 
                      : colors.warning
                  }}>
                    {analysisResults.averageWeightLossPerWeek.toFixed(2)} kg/週
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ 
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px'
            }}>
              <h3 style={{ 
                fontSize: '1.1rem',
                borderBottom: '1px solid #dee2e6',
                paddingBottom: '10px',
                marginTop: 0,
                marginBottom: '15px',
                color: colors.primary
              }}>
                體組成變化
              </h3>
              
              <ProgressIndicator 
                label="體脂肪率變化" 
                value={-analysisResults.bodyFatChange} 
                targetValue={5} 
                color={colors.success}
                unit="%" 
              />
              
              <ProgressIndicator 
                label="體脂肪量變化" 
                value={-analysisResults.fatMassLost} 
                targetValue={5} 
                color={colors.info}
                unit="kg" 
              />
              
              <ProgressIndicator 
                label="肌肉量變化" 
                value={analysisResults.muscleMassChange} 
                targetValue={1} 
                color={colors.warning}
                unit="kg" 
              />
              
              <ProgressIndicator 
                label="水分率變化" 
                value={analysisResults.waterRateChange} 
                targetValue={3} 
                color={colors.primary}
                unit="%" 
              />
              
              <ProgressIndicator 
                label="內臟脂肪變化" 
                value={-analysisResults.visceralFatChange} 
                targetValue={2} 
                color={colors.success}
                unit="" 
              />
              
              <ProgressIndicator 
                label="BMI變化" 
                value={-analysisResults.bmiChange} 
                targetValue={2} 
                color={colors.info}
                unit="" 
              />
              
              <div style={{ 
                marginTop: '25px',
                backgroundColor: '#ffffff',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{ 
                  fontSize: '1rem',
                  margin: '0 0 10px 0',
                  color: colors.dark
                }}>
                  減重成功指數
                </h4>
                
                <div style={{ 
                  height: '20px', 
                  backgroundColor: '#e9ecef',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    width: `${analysisResults.successRate}%`,
                    height: '100%',
                    backgroundColor: (() => {
                      if (analysisResults.successRate > 80) return colors.success;
                      if (analysisResults.successRate > 60) return colors.info;
                      if (analysisResults.successRate > 40) return colors.warning;
                      return colors.danger;
                    })(),
                    borderRadius: '10px',
                    transition: 'width 1s ease-in-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {analysisResults.successRate > 30 ? `${analysisResults.successRate}%` : ''}
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
                  {(() => {
                    if (analysisResults.successRate > 80) return '優秀的減重成效！保持良好的趨勢';
                    if (analysisResults.successRate > 60) return '良好的減重進展，有效率的體脂肪減少';
                    if (analysisResults.successRate > 40) return '減重中，建議優化飲食和運動方式';
                    return '減重效果不理想，建議重新調整計劃';
                  })()}
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side: Chart */}
          <div style={{ flex: '1 1 500px' }}>
            <div style={{ height: '450px' }}>
              <LineChart
                data={analysisChartData}
                options={analysisChartOptions}
              />
            </div>
            {/* Weekly trend analysis - mini chart */}
            {analysisResults.daysBetween >= 28 && (
              <div style={{ 
                marginTop: '20px',
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px'
              }}>
                <h3 style={{
                  fontSize: '1.1rem',
                  margin: '0 0 15px 0',
                  color: colors.primary
                }}>
                  減重速率分析
                </h3>
                
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: '15px' 
                }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{
                      backgroundColor: '#ffffff',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{ fontSize: '0.9rem', color: colors.dark }}>平均每週減重</div>
                      <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 'bold',
                        color: (() => {
                          if (analysisResults.averageWeightLossPerWeek >= 0.5 && analysisResults.averageWeightLossPerWeek <= 1) 
                            return colors.success;
                          if (analysisResults.averageWeightLossPerWeek > 0 && analysisResults.averageWeightLossPerWeek < 0.5)
                            return colors.info;
                          if (analysisResults.averageWeightLossPerWeek > 1)
                            return colors.warning;
                          return colors.danger;
                        })()
                      }}>
                        {analysisResults.averageWeightLossPerWeek.toFixed(2)} kg/週
                      </div>
                      <div style={{ fontSize: '0.8rem', color: colors.muted, marginTop: '5px' }}>
                        {(() => {
                          if (analysisResults.averageWeightLossPerWeek >= 0.5 && analysisResults.averageWeightLossPerWeek <= 1) 
                            return '理想的減重速率';
                          if (analysisResults.averageWeightLossPerWeek > 0 && analysisResults.averageWeightLossPerWeek < 0.5)
                            return '減重速率稍慢';
                          if (analysisResults.averageWeightLossPerWeek > 1)
                            return '減重速率偏快，注意肌肉流失';
                          return '體重無減少或增加';
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{
                      backgroundColor: '#ffffff',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{ fontSize: '0.9rem', color: colors.dark }}>體脂肪減少率</div>
                      <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 'bold',
                        color: analysisResults.bodyFatLossRate > 0 ? colors.success : colors.danger
                      }}>
                        {analysisResults.bodyFatLossRate > 0 ? '' : '-'}{Math.abs(analysisResults.bodyFatLossRate)}%
                      </div>
                      <div style={{ fontSize: '0.8rem', color: colors.muted, marginTop: '5px' }}>
                        {(() => {
                          if (analysisResults.bodyFatLossRate > 10) 
                            return '體脂肪顯著降低';
                          if (analysisResults.bodyFatLossRate > 5)
                            return '體脂肪有效減少';
                          if (analysisResults.bodyFatLossRate > 0)
                            return '體脂肪略有減少';
                          return '體脂肪無減少或增加';
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{
                      backgroundColor: '#ffffff',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{ fontSize: '0.9rem', color: colors.dark }}>肌肉保留率</div>
                      <div style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 'bold',
                        color: analysisResults.leanMassChange >= 0 ? colors.success : colors.danger
                      }}>
                        {analysisResults.leanMassChange >= 0 ? '良好' : '流失'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: colors.muted, marginTop: '5px' }}>
                        肌肉量變化: {analysisResults.leanMassChange > 0 ? '+' : ''}{analysisResults.leanMassChange} kg
                        </div>
                  </div>
                </div>
              </div>
            </div>
             )}
            {/* Recommendations based on analysis */}
            <div style={{ 
              marginTop: '20px',
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px'
            }}>
              <h3 style={{
                fontSize: '1.1rem',
                margin: '0 0 15px 0',
                color: colors.primary
              }}>
                個人化減重建議
              </h3>
              
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                {(() => {
                  const recommendations = [];
                  
                  if (analysisResults.averageWeightLossPerWeek < 0.5 && analysisResults.weightChange > 0) {
                    recommendations.push('建議增加適量有氧運動，控制總熱量攝取，提升減重速率');
                  }
                  
                  if (analysisResults.averageWeightLossPerWeek > 1) {
                    recommendations.push('減重速率偏快，建議適度增加蛋白質攝取，預防肌肉流失');
                  }
                  
                  if (analysisResults.leanMassChange < 0) {
                    recommendations.push('肌肉有所流失，建議增加阻力訓練並適度提高蛋白質攝取');
                  }
                  
                  if (analysisResults.bodyFatLossRate <= 0) {
                    recommendations.push('體脂肪未有效減少，建議優化飲食結構，增加高強度間歇訓練');
                  }
                  
                  if (analysisResults.waterRateChange < 0) {
                    recommendations.push('水分率降低，請確保每日充足飲水，有助代謝和減重');
                  }
                  
                  if (recommendations.length === 0) {
                    recommendations.push('目前減重計劃執行良好，建議保持現有的飲食和運動習慣');
                    recommendations.push('可進一步增加阻力訓練，提升肌肉量以增加基礎代謝率');
                  }
                  
                  return recommendations;
                })().map((rec, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ 
          padding: '30px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '1.1rem', color: colors.dark }}>
            未找到符合條件的數據，請調整分析時間範圍
          </p>
        </div>
      )}
    </Card>
  );
};

export default function Page() {
  // Hydration fix - use useEffect to ensure client-side rendering
  const [isMounted, setIsMounted] = useState(false);
  
  // Initial Client-side rendering hook
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Main state: active tab
  const [activeTab, setActiveTab] = useState<'weightData' | 'consultation'>('weightData');
  
  // 九大數據減重區塊的子頁籤
  const [weightDataSubTab, setWeightDataSubTab] = useState('overview');
  
  // 營養諮詢區塊的子頁籤
  const [consultationSubTab, setConsultationSubTab] = useState('records');
  
  // 趨勢圖顯示數據量選擇
  const [trendDataCount, setTrendDataCount] = useState(5);
  
  // Tab 組件 - 用於顯示頁內分頁
  const TabNavigation = ({ tabs, activeTab, onTabChange }: TabNavigationProps) => {
    return (
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #dee2e6',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '12px 20px',
              borderRadius: '4px 4px 0 0',
              backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#007bff' : '#495057',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #007bff' : 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === tab.id ? '600' : '400',
              transition: 'all 0.2s ease',
              position: 'relative',
              zIndex: 1,
              minWidth: '120px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.color = '#007bff';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#495057';
              }
            }}
          >
            {tab.icon && (
              <span>{tab.icon}</span>
            )}
            {tab.label}
          </button>
        ))}
        
        {/* 底部動畫指示器 */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          height: '3px',
          backgroundColor: '#007bff',
          transition: 'all 0.3s ease-in-out',
          zIndex: 0
        }}></div>
      </div>
    );
  };

  // Sample data initialization
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([
    { id: 1, date: '2024-10-10', bmi: 27.5, weight: 90, bodyFat: 36, visceralFat: 10, waterRate: 55, muscleMass: 40, boneMineral: 3.2, bmr: 1500 },
    { id: 2, date: '2024-11-11', bmi: 26.8, weight: 85, bodyFat: 34, visceralFat: 9, waterRate: 56, muscleMass: 41, boneMineral: 3.3, bmr: 1480 },
    { id: 3, date: '2024-12-19', bmi: 25.0, weight: 80, bodyFat: 32, visceralFat: 8, waterRate: 57, muscleMass: 42, boneMineral: 3.4, bmr: 1460 },
    { id: 4, date: '2024-12-31', bmi: 23.5, weight: 70, bodyFat: 28, visceralFat: 7, waterRate: 58, muscleMass: 43, boneMineral: 3.5, bmr: 1440 },
    { id: 5, date: '2025-01-01', bmi: 22.0, weight: 65, bodyFat: 26, visceralFat: 6, waterRate: 59, muscleMass: 44, boneMineral: 3.6, bmr: 1420 },
    { id: 6, date: '2025-01-05', bmi: 21.5, weight: 60, bodyFat: 24, visceralFat: 5, waterRate: 60, muscleMass: 45, boneMineral: 3.7, bmr: 1400 },
    { id: 7, date: '2025-01-10', bmi: 21.0, weight: 58, bodyFat: 23, visceralFat: 5, waterRate: 60, muscleMass: 46, boneMineral: 3.7, bmr: 1390 },
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  
  const [consultationRecords, setConsultationRecords] = useState<Consultation[]>([]);
  const [consultation, setConsultation] = useState<Consultation>({
    id: null,
    consultationDate: '',
    preConsultation: '',
    postConsultation: '',
    consultationType: 'in-person',
  });
  
  // Current five type data for member info
  const currentFiveTypeData = [
    { subject: '肝鬱氣滯型', score: 5 },
    { subject: '脾虛濕阻型', score: 3 },
    { subject: '氣血虛弱型', score: 3 },
    { subject: '胃熱濕阻型', score: 2 },
    { subject: '腎陽虛痰濁型', score: 1 },
  ];
  
  // Historical five type data for member info
  const historicalFiveTypeData = [
    {
      date: '2024-01-20',
      '肝鬱氣滯型': 4,
      '脾虛濕阻型': 3,
      '氣血虛弱型': 1,
      '胃熱濕阻型': 2,
      '腎陽虛痰濁型': 2,
    },
    {
      date: '2024-02-26',
      '肝鬱氣滯型': 3,
      '脾虛濕阻型': 2,
      '氣血虛弱型': 2,
      '胃熱濕阻型': 3,
      '腎陽虛痰濁型': 1,
    },
  ];
  
  // Analysis date range filter state
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    type: 'all',
    days: 0
  });
  
  // Consultation date filters
  const [consultationDateRange, setConsultationDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  // Consultation form reference for scrolling
  const consultationFormRef = useRef<HTMLFormElement | null>(null);
  
  // Filtered consultations based on date range
  const filteredConsultations = useMemo(() => {
    return consultationRecords.filter((record) => {
      if (consultationDateRange.startDate && consultationDateRange.endDate) {
        return record.consultationDate >= consultationDateRange.startDate && 
               record.consultationDate <= consultationDateRange.endDate;
      }
      return true;
    });
  }, [consultationRecords, consultationDateRange]);
  
  // Chart data for weight metrics
  const bodyCompositionChartData = useMemo(() => {
    return {
      labels: weightRecords.map((record) => record.date),
      datasets: [
        {
          label: '體脂肪 (kg)',
          data: weightRecords.map((record) => (record.weight * record.bodyFat) / 100),
          borderColor: '#FF6384',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4,
          fill: true,
        },
        {
          label: '肌肉量 (kg)',
          data: weightRecords.map((record) => record.muscleMass),
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4,
          fill: true,
        },
        {
          label: '骨礦物量 (kg)',
          data: weightRecords.map((record) => record.boneMineral),
          borderColor: '#4BC0C0',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [weightRecords]);
  
  const bodyMetricsChartData = useMemo(() => {
    return {
      labels: weightRecords.map((record) => record.date),
      datasets: [
        {
          label: 'BMI',
          data: weightRecords.map((record) => record.bmi),
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: '體脂肪率 (%)',
          data: weightRecords.map((record) => record.bodyFat),
          borderColor: '#FFCE56',
          backgroundColor: 'rgba(255, 206, 86, 0.2)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: '內臟脂肪等級',
          data: weightRecords.map((record) => record.visceralFat),
          borderColor: '#4BC0C0',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y1',
        },
        {
          label: '水分率 (%)',
          data: weightRecords.map((record) => record.waterRate),
          borderColor: '#9966FF',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y',
        },
      ],
    };
  }, [weightRecords]);
  
  const bmrChartData = useMemo(() => {
    return {
      labels: weightRecords.map((record) => record.date),
      datasets: [
        {
          label: 'BMR (kcal)',
          data: weightRecords.map((record) => record.bmr),
          borderColor: '#FF9F40',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [weightRecords]);
  
  // Enhanced chart options
  const bodyCompositionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { 
        display: true, 
        text: '體組成趨勢圖 - 體脂肪, 肌肉量, 骨礦物量', 
        font: { size: 16, weight: 'bold' as const },
        padding: { bottom: 20 },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: '#333',
        bodyColor: '#333',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
      },
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12 }
        }
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(0,0,0,0.05)',
          borderDash: [3, 3],
        },
        ticks: { font: { size: 12 } },
        title: {
          display: true,
          text: '重量 (kg)',
          font: { size: 14 }
        }
      },
      x: {
        grid: { display: false },
        ticks: { 
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 45
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    elements: {
      line: { tension: 0.4 },
      point: { radius: 3, hoverRadius: 5 }
    },
    layout: {
      padding: {
        top: 10,
        right: 20,
        bottom: 10,
        left: 20
      }
    },
  };
  
  const bodyMetricsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { 
        display: true, 
        text: 'BMI、體脂肪率、內臟脂肪等級、水分率趨勢圖', 
        font: { size: 16, weight: 'bold' as const },
        padding: { bottom: 20 },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: '#333',
        bodyColor: '#333',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
      },
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12 }
        }
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(0,0,0,0.05)',
          borderDash: [3, 3],
        },
        ticks: { font: { size: 12 } },
        title: {
          display: true,
          text: 'BMI / 百分比 (%)',
          font: { size: 14 }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: { font: { size: 12 } },
        title: {
          display: true,
          text: '內臟脂肪等級',
          font: { size: 14 }
        }
      },
      x: {
        grid: { display: false },
        ticks: { 
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 45
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };
  
  const bmrChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { 
        display: true, 
        text: '基礎代謝率 (BMR) 趨勢', 
        font: { size: 16, weight: 'bold' as const },
        padding: { bottom: 20 },
      },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: '#333',
        bodyColor: '#333',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: function(context: any) {
            return `基礎代謝率: ${context.parsed.y} kcal/天`;
          }
        }
      },
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12 }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0,0,0,0.05)',
          borderDash: [3, 3],
        },
        ticks: { 
          font: { size: 12 },
          callback: function(value: any) {
            return value + ' kcal';
          }
        },
      },
      x: {
        grid: { display: false },
        ticks: { 
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 45
        }
      }
    },
  };
  
  // Colors and styling
  const colors = theme.light;
  
  // Container style
  const containerStyle = {
    width: '100%',
    maxWidth: '1800px',
    margin: '0 auto',
    padding: '20px',
  } as React.CSSProperties;
  // Button styles
  const tabButtonStyle = {
    padding: '12px 24px',
    borderRadius: '25px',
    cursor: 'pointer',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    fontSize: '1rem',
    fontWeight: 'bold',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    margin: '0 10px',
  } as React.CSSProperties;
  
  // Active tab style
  const getTabButtonStyle = (tab: 'weightData' | 'consultation') => {
    return {
      ...tabButtonStyle,
      backgroundColor: activeTab === tab ? colors.primary : '#f0f0f0',
      color: activeTab === tab ? 'white' : colors.dark,
      transform: activeTab === tab ? 'translateY(-2px)' : 'none',
      boxShadow: activeTab === tab ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
    } as React.CSSProperties;
  };
  
  // Form styles
  const formStyles = {
    container: {
      padding: '20px',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
    },
    formGroup: {
      marginBottom: '15px',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: 'bold',
      fontSize: '0.9rem',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: '1px solid #ced4da',
      fontSize: '1rem',
      transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: '1px solid #ced4da',
      fontSize: '1rem',
      minHeight: '120px',
      resize: 'vertical' as React.CSSProperties['resize'],
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: '1px solid #ced4da',
      fontSize: '1rem',
      backgroundColor: 'white',
    },
    button: {
      padding: '10px 16px',
      backgroundColor: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '1rem',
      transition: 'background-color 0.15s ease-in-out',
    },
  };
  
  // Table styles
  const tableStyles = {
    container: {
      overflowX: 'auto' as React.CSSProperties['overflowX'],
      marginTop: '20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      borderRadius: '8px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as React.CSSProperties['borderCollapse'],
      fontSize: '0.9rem',
    },
    thead: {
      backgroundColor: colors.primary,
      color: 'white',
    },
    th: {
      padding: '12px 15px',
      textAlign: 'left' as React.CSSProperties['textAlign'],
      fontWeight: 'bold',
      borderBottom: '2px solid #ddd',
    },
    tr: {
      borderBottom: '1px solid #ddd',
      transition: 'background-color 0.2s ease',
    },
    trEven: {
      backgroundColor: '#f8f9fa',
    },
    trHover: {
      backgroundColor: '#f1f1f1',
    },
    td: {
      padding: '10px 15px',
      verticalAlign: 'middle' as React.CSSProperties['verticalAlign'],
    },
  };
  
  // Don't render content until client-side hydration is complete
  if (!isMounted) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100%',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '5px solid rgba(0, 123, 255, 0.1)',
          borderTopColor: '#007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}></div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  return (
    <div style={containerStyle}>
      {/* Main navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '30px',
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '15px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
      }}>
        <button
          onClick={() => setActiveTab('weightData')}
          style={getTabButtonStyle('weightData')}
          onMouseOver={(e) => {
            if (activeTab !== 'weightData') {
              e.currentTarget.style.backgroundColor = '#e2e6ea';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseOut={(e) => {
            if (activeTab !== 'weightData') {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
              e.currentTarget.style.transform = 'none';
            }
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onMouseUp={(e) => {
            if (activeTab === 'weightData') {
              e.currentTarget.style.transform = 'translateY(-2px)';
            } else {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center', 
            gap: '8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            九大數據減重分析
          </div>
        </button>
        <button
          onClick={() => setActiveTab('consultation')}
          style={getTabButtonStyle('consultation')}
          onMouseOver={(e) => {
            if (activeTab !== 'consultation') {
              e.currentTarget.style.backgroundColor = '#e2e6ea';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseOut={(e) => {
            if (activeTab !== 'consultation') {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
              e.currentTarget.style.transform = 'none';
            }
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onMouseUp={(e) => {
            if (activeTab === 'consultation') {
              e.currentTarget.style.transform = 'translateY(-2px)';
            } else {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center', 
            gap: '8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            營養師諮詢記錄
          </div>
        </button>
      </div>
      
      {/* 會員資訊區塊 - 固定顯示在所有頁籤 */}
      <MemberInfoCard 
        fiveTypeData={currentFiveTypeData}
        historicalFiveTypeData={historicalFiveTypeData}
      />
      
      {/* 主內容區域 - 根據選擇的頁籤顯示不同內容 */}
      {activeTab === 'weightData' ? (
        <div>
          {/* 九大數據減重分析子頁籤 */}
          <TabNavigation
            tabs={[
              { id: 'overview', label: '數據總覽' },
              { id: 'analysis', label: '減重分析' },
              { id: 'trends', label: '趨勢圖表' },
              { id: 'records', label: '歷史數據' },
            ]}
            activeTab={weightDataSubTab}
            onTabChange={(tabId) => setWeightDataSubTab(tabId)}
          />
          
          {/* 子頁籤內容 */}
          {weightDataSubTab === 'overview' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ flex: '1 1 100%' }}>
                <Card title="最新檢測數據">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    {/* Most recent weight record data summary */}
                    {weightRecords.length > 0 && (() => {
                      const latestRecord = [...weightRecords].sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                      )[0];
                      
                      const metrics = [
                        { label: '測量日期', value: latestRecord.date, unit: '', color: colors.primary },
                        { label: '體重', value: latestRecord.weight, unit: 'kg', color: colors.primary },
                        { label: 'BMI', value: latestRecord.bmi, unit: '', color: 
                          latestRecord.bmi < 18.5 ? '#17a2b8' : 
                          latestRecord.bmi < 24 ? '#28a745' : 
                          latestRecord.bmi < 27 ? '#ffc107' : 
                          latestRecord.bmi < 30 ? '#fd7e14' : '#dc3545'
                        },
                        { label: '體脂肪率', value: latestRecord.bodyFat, unit: '%', color: colors.warning },
                        { label: '內臟脂肪', value: latestRecord.visceralFat, unit: '', color: colors.danger },
                        { label: '水分率', value: latestRecord.waterRate, unit: '%', color: colors.info },
                        { label: '肌肉量', value: latestRecord.muscleMass, unit: 'kg', color: colors.success },
                        { label: '骨礦物量', value: latestRecord.boneMineral, unit: 'kg', color: '#6f42c1' },
                        { label: '基礎代謝率', value: latestRecord.bmr, unit: 'kcal', color: '#fd7e14' },
                      ];
                      
                      return (
                        <div style={{ 
                          width: '100%', 
                          display: 'flex', 
                          flexWrap: 'wrap',
                          gap: '16px', 
                          justifyContent: 'space-between'
                        }}>
                          {metrics.map((metric, index) => (
                            <div key={index} style={{ 
                              flex: index === 0 ? '1 1 100%' : '1 1 160px',
                              backgroundColor: index === 0 ? '#f8f9fa' : 'white',
                              padding: '16px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                              textAlign: 'center',
                              border: '1px solid #eee',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              position: 'relative',
                              overflow: 'hidden'
                            }}>
                              {index !== 0 && (
                                <div style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  width: '5px',
                                  height: '100%',
                                  backgroundColor: metric.color,
                                }}></div>
                              )}
                              <div style={{ 
                                fontSize: '0.9rem', 
                                fontWeight: 'bold',
                                color: '#6c757d',
                                marginBottom: '8px' 
                              }}>
                                {metric.label}
                              </div>
                              <div style={{ 
                                fontSize: index === 0 ? '1.1rem' : '1.5rem', 
                                fontWeight: 'bold',
                                color: index === 0 ? colors.primary : '#333'
                              }}>
                                {metric.value}{metric.unit}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </Card>
              </div>
            </div>
          )}
          
          {weightDataSubTab === 'analysis' && (
            <DataAnalysisCard 
              weightRecords={weightRecords}
              dateRange={dateRange}
              onDateRangeChange={(newRange) => setDateRange(newRange)}
            />
          )}
          
          {weightDataSubTab === 'trends' && (
            <div>
              <Card title="體重與BMI趨勢">
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ marginRight: '10px', fontWeight: 'bold' }}>
                    顯示資料筆數:
                  </label>
                  <select 
                    value={trendDataCount} 
                    onChange={(e) => setTrendDataCount(parseInt(e.target.value))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #ced4da',
                    }}
                  >
                    <option value={5}>最近 5 筆</option>
                    <option value={10}>最近 10 筆</option>
                    <option value={0}>全部資料</option>
                  </select>
                </div>
                
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '20px'
                }}>
                  <div style={{ flex: '1 1 450px', height: '300px' }}>
                    <LineChart
                      data={{
                        labels: weightRecords
                          .slice(-trendDataCount || weightRecords.length)
                          .map((record) => record.date),
                        datasets: [
                          {
                            label: '體重 (kg)',
                            data: weightRecords
                              .slice(-trendDataCount || weightRecords.length)
                              .map((record) => record.weight),
                            borderColor: colors.primary,
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            fill: true,
                            tension: 0.4,
                            yAxisID: 'y',
                          },
                          {
                            label: 'BMI',
                            data: weightRecords
                              .slice(-trendDataCount || weightRecords.length)
                              .map((record) => record.bmi),
                            borderColor: colors.info,
                            backgroundColor: 'rgba(23, 162, 184, 0.1)',
                            fill: true,
                            tension: 0.4,
                            yAxisID: 'y1',
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          title: { display: false },
                          tooltip: {
                            mode: 'index',
                            intersect: false,
                          },
                        },
                        scales: {
                          y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                              display: true,
                              text: '體重 (kg)',
                            },
                          },
                          y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                              drawOnChartArea: false,
                            },
                            title: {
                              display: true,
                              text: 'BMI',
                            },
                          },
                          x: {
                            grid: { display: false },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </Card>
              
              <Card title="體組成趨勢">
                <div style={{ height: '350px' }}>
                  <LineChart
                    data={{
                      labels: weightRecords
                        .slice(-trendDataCount || weightRecords.length)
                        .map((record) => record.date),
                      datasets: [
                        {
                          label: '體脂肪率 (%)',
                          data: weightRecords
                            .slice(-trendDataCount || weightRecords.length)
                            .map((record) => record.bodyFat),
                          borderColor: colors.warning,
                          backgroundColor: 'rgba(255, 193, 7, 0.1)',
                          fill: true,
                          tension: 0.4,
                        },
                        {
                          label: '水分率 (%)',
                          data: weightRecords
                            .slice(-trendDataCount || weightRecords.length)
                            .map((record) => record.waterRate),
                          borderColor: colors.info,
                          backgroundColor: 'rgba(23, 162, 184, 0.1)',
                          fill: true,
                          tension: 0.4,
                        },
                        {
                          label: '肌肉率 (%)',
                          data: weightRecords
                            .slice(-trendDataCount || weightRecords.length)
                            .map((record) => record.muscleMass / record.weight * 100),
                          borderColor: colors.success,
                          backgroundColor: 'rgba(40, 167, 69, 0.1)',
                          fill: true,
                          tension: 0.4,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                        },
                      },
                      scales: {
                        y: {
                          title: {
                            display: true,
                            text: '百分比 (%)',
                          },
                        },
                        x: {
                          grid: { display: false },
                        },
                      },
                    }}
                  />
                </div>
              </Card>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
                <div style={{ flex: '1 1 450px' }}>
                  <Card title="體組成重量趨勢">
                    <div style={{ height: '300px' }}>
                      <LineChart
                        data={bodyCompositionChartData}
                        options={bodyCompositionChartOptions}
                      />
                    </div>
                  </Card>
                </div>
                <div style={{ flex: '1 1 450px' }}>
                  <Card title="基礎代謝率趨勢">
                    <div style={{ height: '300px' }}>
                      <LineChart
                        data={bmrChartData}
                        options={bmrChartOptions}
                      />
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
          
          {weightDataSubTab === 'records' && (
            <Card title="歷史數據記錄">
              <div style={tableStyles.container}>
                <table style={tableStyles.table}>
                  <thead style={tableStyles.thead}>
                    <tr>
                      <th style={tableStyles.th}>日期</th>
                      <th style={tableStyles.th}>體重 (kg)</th>
                      <th style={tableStyles.th}>BMI</th>
                      <th style={tableStyles.th}>體脂肪率 (%)</th>
                      <th style={tableStyles.th}>內臟脂肪</th>
                      <th style={tableStyles.th}>水分率 (%)</th>
                      <th style={tableStyles.th}>肌肉量 (kg)</th>
                      <th style={tableStyles.th}>骨礦物量 (kg)</th>
                      <th style={tableStyles.th}>基礎代謝 (kcal)</th>
                      <th style={tableStyles.th}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weightRecords.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '20px' }}>
                          尚無數據記錄
                        </td>
                      </tr>
                    ) : (
                      [...weightRecords]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((record, index) => (
                          <tr 
                            key={record.id}
                            style={{
                              ...tableStyles.tr,
                              ...(index % 2 === 1 ? tableStyles.trEven : {}),
                            }}
                            onMouseOver={(e) => Object.assign(e.currentTarget.style, tableStyles.trHover)}
                            onMouseOut={(e) => Object.assign(
                              e.currentTarget.style,
                              tableStyles.tr,
                              index % 2 === 1 ? tableStyles.trEven : {}
                            )}
                          >
                            <td style={tableStyles.td}>{record.date}</td>
                            <td style={tableStyles.td}>{record.weight}</td>
                            <td style={tableStyles.td}>{record.bmi}</td>
                            <td style={tableStyles.td}>{record.bodyFat}</td>
                            <td style={tableStyles.td}>{record.visceralFat}</td>
                            <td style={tableStyles.td}>{record.waterRate}</td>
                            <td style={tableStyles.td}>{record.muscleMass}</td>
                            <td style={tableStyles.td}>{record.boneMineral}</td>
                            <td style={tableStyles.td}>{record.bmr}</td>
                            <td style={tableStyles.td}>
                              <button
                                onClick={() => {
                                  // Edit record functionality would go here
                                  alert(`編輯紀錄 ID: ${record.id}`);
                                }}
                                style={{
                                  padding: '5px 10px',
                                  backgroundColor: colors.info,
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  marginRight: '5px',
                                  cursor: 'pointer',
                                }}
                              >
                                編輯
                              </button>
                              <button
                                onClick={() => {
                                  // Delete record functionality would go here
                                  if (confirm('確定要刪除此紀錄嗎？')) {
                                    setWeightRecords(weightRecords.filter(r => r.id !== record.id));
                                  }
                                }}
                                style={{
                                  padding: '5px 10px',
                                  backgroundColor: colors.danger,
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                刪除
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
              
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ 
                  borderLeft: `4px solid ${colors.primary}`,
                  paddingLeft: '10px',
                  fontSize: '1.2rem',
                  marginBottom: '15px'
                }}>
                  新增數據紀錄
                </h3>
                
                <form style={formStyles.container}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={formStyles.formGroup}>
                        <label htmlFor="recordDate" style={formStyles.label}>測量日期</label>
                        <input
                          type="date"
                          id="recordDate"
                          style={formStyles.input}
                        />
                      </div>
                    </div>
                    
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={formStyles.formGroup}>
                        <label htmlFor="weight" style={formStyles.label}>體重 (kg)</label>
                        <input
                          type="number"
                          id="weight"
                          step="0.1"
                          style={formStyles.input}
                        />
                      </div>
                    </div>
                    
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={formStyles.formGroup}>
                        <label htmlFor="bmi" style={formStyles.label}>BMI</label>
                        <input
                          type="number"
                          id="bmi"
                          step="0.1"
                          style={formStyles.input}
                        />
                      </div>
                    </div>
                    
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={formStyles.formGroup}>
                        <label htmlFor="bodyFat" style={formStyles.label}>體脂肪率 (%)</label>
                        <input
                          type="number"
                          id="bodyFat"
                          step="0.1"
                          style={formStyles.input}
                        />
                      </div>
                    </div>
                    
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={formStyles.formGroup}>
                        <label htmlFor="visceralFat" style={formStyles.label}>內臟脂肪</label>
                        <input
                          type="number"
                          id="visceralFat"
                          step="1"
                          style={formStyles.input}
                        />
                      </div>
                    </div>
                    
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={formStyles.formGroup}>
                        <label htmlFor="waterRate" style={formStyles.label}>水分率 (%)</label>
                        <input
                          type="number"
                          id="waterRate"
                          step="0.1"
                          style={formStyles.input}
                        />
                      </div>
                    </div>
                    
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={formStyles.formGroup}>
                        <label htmlFor="muscleMass" style={formStyles.label}>肌肉量 (kg)</label>
                        <input
                          type="number"
                          id="muscleMass"
                          step="0.1"
                          style={formStyles.input}
                        />
                      </div>
                    </div>
                    
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={formStyles.formGroup}>
                        <label htmlFor="boneMineral" style={formStyles.label}>骨礦物量 (kg)</label>
                        <input
                          type="number"
                          id="boneMineral"
                          step="0.1"
                          style={formStyles.input}
                        />
                      </div>
                    </div>
                    
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={formStyles.formGroup}>
                        <label htmlFor="bmr" style={formStyles.label}>基礎代謝率 (kcal)</label>
                        <input
                          type="number"
                          id="bmr"
                          step="1"
                          style={formStyles.input}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        // Add new record functionality would go here
                        alert('新增紀錄');
                      }}
                      style={{
                        ...formStyles.button,
                        backgroundColor: colors.success,
                        padding: '12px 30px',
                        fontSize: '1.1rem',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                      }}
                    >
                      新增紀錄
                    </button>
                  </div>
                  </form>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div>
          {/* 營養諮詢區塊子頁籤 */}
          <TabNavigation
            tabs={[
              { id: 'records', label: '諮詢紀錄' },
              { id: 'add', label: '新增諮詢' },
            ]}
            activeTab={consultationSubTab}
            onTabChange={(tabId) => setConsultationSubTab(tabId)}
          />
          
          {/* 子頁籤內容 */}
          {consultationSubTab === 'records' && (
            <Card title="諮詢紀錄列表">
              <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    開始日期
                  </label>
                  <input
                    type="date"
                    value={consultationDateRange.startDate}
                    onChange={(e) => setConsultationDateRange({ ...consultationDateRange, startDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #ced4da',
                    }}
                  />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    結束日期
                  </label>
                  <input
                    type="date"
                    value={consultationDateRange.endDate}
                    onChange={(e) => setConsultationDateRange({ ...consultationDateRange, endDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #ced4da',
                    }}
                  />
                </div>
                <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => setConsultationDateRange({ startDate: '', endDate: '' })}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f0f0f0',
                      color: '#333',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    重置篩選
                  </button>
                </div>
              </div>
              
              <div style={tableStyles.container}>
                <table style={tableStyles.table}>
                  <thead style={tableStyles.thead}>
                    <tr>
                      <th style={tableStyles.th}>日期</th>
                      <th style={tableStyles.th}>諮詢方式</th>
                      <th style={tableStyles.th}>諮詢前狀況</th>
                      <th style={tableStyles.th}>諮詢建議</th>
                      <th style={tableStyles.th}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConsultations.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                          尚無諮詢紀錄
                        </td>
                      </tr>
                    ) : (
                      [...filteredConsultations]
                        .sort((a, b) => new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime())
                        .map((record, index) => (
                          <tr
                            key={record.id}
                            style={{
                              ...tableStyles.tr,
                              ...(index % 2 === 1 ? tableStyles.trEven : {}),
                            }}
                            onMouseOver={(e) => Object.assign(e.currentTarget.style, tableStyles.trHover)}
                            onMouseOut={(e) => Object.assign(
                              e.currentTarget.style,
                              tableStyles.tr,
                              index % 2 === 1 ? tableStyles.trEven : {}
                            )}
                          >
                            <td style={tableStyles.td}>{record.consultationDate}</td>
                            <td style={tableStyles.td}>
                              {record.consultationType === 'in-person' 
                                ? '現場諮詢' 
                                : record.consultationType === 'video' 
                                  ? '視訊諮詢' 
                                  : '電話諮詢'}
                            </td>
                            <td style={{
                              ...tableStyles.td,
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {record.preConsultation}
                            </td>
                            <td style={{
                              ...tableStyles.td,
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {record.postConsultation}
                            </td>
                            <td style={tableStyles.td}>
                              <button
                                onClick={() => {
                                  setConsultation(record);
                                  setConsultationSubTab('add');
                                  setTimeout(() => {
                                    if (consultationFormRef.current) {
                                      consultationFormRef.current.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }, 100);
                                }}
                                style={{
                                  padding: '5px 10px',
                                  backgroundColor: colors.info,
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  marginRight: '5px',
                                  cursor: 'pointer',
                                }}
                              >
                                檢視/編輯
                              </button>
                              <button
                                onClick={() => {
                                  // Delete consultation record functionality
                                  if (confirm('確定要刪除此諮詢紀錄嗎？')) {
                                    setConsultationRecords(consultationRecords.filter(r => r.id !== record.id));
                                  }
                                }}
                                style={{
                                  padding: '5px 10px',
                                  backgroundColor: colors.danger,
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                刪除
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          
          {consultationSubTab === 'add' && (
            <Card title={consultation.id ? '編輯諮詢紀錄' : '新增諮詢紀錄'}>
              <form ref={consultationFormRef} style={formStyles.container}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={formStyles.formGroup}>
                      <label htmlFor="consultationDate" style={formStyles.label}>諮詢日期</label>
                      <input
                        type="date"
                        id="consultationDate"
                        value={consultation.consultationDate}
                        onChange={(e) => setConsultation({ ...consultation, consultationDate: e.target.value })}
                        style={formStyles.input}
                      />
                    </div>
                  </div>
                  
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={formStyles.formGroup}>
                      <label htmlFor="consultationType" style={formStyles.label}>諮詢方式</label>
                      <select
                        id="consultationType"
                        value={consultation.consultationType}
                        onChange={(e) => setConsultation({ ...consultation, consultationType: e.target.value })}
                        style={formStyles.select}
                      >
                        <option value="in-person">現場諮詢</option>
                        <option value="video">視訊諮詢</option>
                        <option value="phone">電話諮詢</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div style={formStyles.formGroup}>
                  <label htmlFor="preConsultation" style={formStyles.label}>諮詢前狀況</label>
                  <textarea
                    id="preConsultation"
                    value={consultation.preConsultation}
                    onChange={(e) => setConsultation({ ...consultation, preConsultation: e.target.value })}
                    placeholder="請描述會員目前狀況、飲食習慣、運動習慣等..."
                    style={formStyles.textarea}
                  ></textarea>
                </div>
                
                <div style={formStyles.formGroup}>
                  <label htmlFor="postConsultation" style={formStyles.label}>諮詢建議</label>
                  <textarea
                    id="postConsultation"
                    value={consultation.postConsultation}
                    onChange={(e) => setConsultation({ ...consultation, postConsultation: e.target.value })}
                    placeholder="請記錄營養師給予的建議、飲食調整方案等..."
                    style={formStyles.textarea}
                  ></textarea>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      // Reset form
                      setConsultation({
                        id: null,
                        consultationDate: '',
                        preConsultation: '',
                        postConsultation: '',
                        consultationType: 'in-person',
                      });
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#f0f0f0',
                      color: '#333',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    清除表單
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      // Validate form
                      if (!consultation.consultationDate) {
                        alert('請選擇諮詢日期');
                        return;
                      }
                      
                      if (consultation.id) {
                        // Update existing record
                        setConsultationRecords(
                          consultationRecords.map(r => r.id === consultation.id ? consultation : r)
                        );
                      } else {
                        // Add new record
                        const newRecord = {
                          ...consultation,
                          id: Date.now(), // Simple id generation
                        };
                        setConsultationRecords([...consultationRecords, newRecord]);
                      }
                      
                      // Reset form and go back to records
                      setConsultation({
                        id: null,
                        consultationDate: '',
                        preConsultation: '',
                        postConsultation: '',
                        consultationType: 'in-person',
                      });
                      setConsultationSubTab('records');
                    }}
                    style={{
                      padding: '10px 30px',
                      backgroundColor: consultation.id ? colors.info : colors.success,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                    }}
                  >
                    {consultation.id ? '更新紀錄' : '儲存紀錄'}
                  </button>
                </div>
              </form>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}