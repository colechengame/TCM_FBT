'use client';
import { useState, useEffect, useMemo, useCallback, useRef, JSX, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from 'react';
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
  ChartOptions,
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
      'rgba(240, 115, 114, 0.6)',
    ],
  },
};

// Component for reusable styled cards
interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false);
  // 使用新主題的 light 模式或根據使用者偏好動態選擇主題
  const colors = theme.light;
  
  const cardStyle = {
    borderWidth: '0px',
    borderRadius: '16px',
    padding: '20px',
    background: 'linear-gradient(135deg, #FFFFFF, #FFFFFF)', // 漸層背景
    boxShadow: isHovered 
      ? '0 12px 24px rgba(0, 0, 0, 0.2)' 
      : '0 6px 12px rgba(0, 0, 0, 0.15)',
    marginBottom: '20px',
    transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
    transform: isHovered ? 'translateY(-4px)' : 'none',
  };
  
  const titleStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: `4px solid ${colors.primary}`,
    color: colors.primary,
    fontSize: '1.75rem',
    fontWeight: 'bold',
  };
  
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
const MemberInfoCard: React.FC<{ fiveTypeData: FiveTypeRecord[], historicalFiveTypeData: HistoricalFiveTypeRecord[] }> = ({ fiveTypeData, historicalFiveTypeData }) => {
  const [fiveTypeView, setFiveTypeView] = useState<'current' | 'historical'>('current');
  const colors = theme.light;
  
  // Enhanced five type data with colors
  const enhancedFiveTypeData = useMemo(() => {
    return fiveTypeData.map((item: FiveTypeRecord, index: number) => ({
      ...item,
      color: colors.chartColors[index % colors.chartColors.length],
    }));
  }, [fiveTypeData]);

  // Chart options for the five type history line chart
  const lineChartFiveTypeData = {
    labels: historicalFiveTypeData.map((item: { date: any; }) => item.date),
    datasets: Object.keys(historicalFiveTypeData[0])
      .filter(key => key !== 'date')
      .map((key, index) => ({
        label: key,
        data: historicalFiveTypeData.map((item: { [x: string]: any; }) => item[key]),
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
  };
  
  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: '1rem',
  };
  
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
                {enhancedFiveTypeData.map((item: { color: any; subject: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; score: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }, index: Key | null | undefined) => (
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
                      fontWeight: 'normal',
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
                {historicalFiveTypeData.map((record: HistoricalFiveTypeRecord, index: Key | null | undefined) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: '15px',
                      backgroundColor: typeof index === 'number' && index % 2 === 0 ? '#f8f9fa' : '#ffffff',
                      padding: '10px',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{
                      fontWeight: 'normal',
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
                        position: 'top' as const,
                        labels: { 
                          font: { size: 12 },
                          usePointStyle: true,
                          padding: 15,
                        }
                      },
                      title: { 
                        display: true, 
                        text: '五型體質歷史數據趨勢', 
                        font: { size: 16, weight: 'normal' as const },
                        padding: { bottom: 15 }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        titleColor: colors.dark,
                        bodyColor: colors.dark,
                        titleFont: { weight: 'normal' as const },
                        bodyFont: { size: 13 },
                        padding: 10,
                        cornerRadius: 6,
                        borderColor: colors.border,
                        borderWidth: 1,
                        caretSize: 8,
                        displayColors: true,
                        callbacks: {
                          label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}`;
                          }
                        }
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
const DataAnalysisCard: React.FC<{ weightRecords: WeightRecord[], dateRange: { startDate: string, type: 'all' | 'days' | 'custom', days: number }, onDateRangeChange: (range: { startDate: string, type: 'all' | 'days' | 'custom', days: number }) => void }> = ({ weightRecords, dateRange, onDateRangeChange }) => {
  const colors = theme.light;
  
  // Progress indicator component for showing changes
  interface ProgressIndicatorProps {
    label: string;
    value: number;
    targetValue: number;
    color: string;
    unit?: string;
    reverse?: boolean;
  }

  const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ label, value, targetValue, color, unit = '', reverse = false }) => {
    const percentage = targetValue ? (value / targetValue) * 100 : 0;
    const isPositive = reverse ? value <= 0 : value >= 0;
    
    return (
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>{label}</span>
          <span style={{ 
            fontWeight: 'normal',
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
  }, [analysisResults]);
  
  // ChartOptions type is already imported at the top

  // 為 LineChart 指定 ChartOptions 型別
  const analysisChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top', // 這裡 TypeScript 現在識別為字面量 "top"
        labels: {
          font: { size: 14 },
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: true,
        text: '體重與體組成變化分析',
        font: {
          size: 18,
          weight: 'normal' // 請確保這裡是字面量 "normal"
        },
        padding: { bottom: 20 },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: colors.dark,
        bodyColor: colors.dark,
        titleFont: { weight: 'normal' },
        bodyFont: { size: 14 },
        padding: 12,
        cornerRadius: 6,
        borderColor: colors.border,
        borderWidth: 1,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            label += context.parsed.y.toFixed(1);
            return label;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0,0,0,0.05)',
          lineWidth: 1,         
        },
        ticks: {
          font: { size: 14 },
          padding: 10,
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 14,weight: 'normal' as const }, // 同樣確保 "normal" 為字面量
          padding: 10,
        },
      },
    },
    layout: {
      padding: { top: 10, right: 20, bottom: 10, left: 20 },
    },
    elements: {
      line: { tension: 0.4 },
      point: {
        radius: 6,
        hoverRadius: 9,
        borderWidth: 3,
        hoverBorderWidth: 4,
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuad' as const  // 可使用 as const 來保證字面量類型
    }
  };
    
  // Enhanced button component for date filtering
  const DateFilterButton: React.FC<{ days: number, label: string, currentStartDate: string, onClick: (days: number) => void }> = ({ days, label, currentStartDate, onClick }) => {
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
    };
    
    return (
      <button
        style={style as React.CSSProperties}
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
  
  // Tab 組件 - 用於顯示頁內分頁
interface Tab {
  id: string;
  icon?: React.ReactNode;
  label: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

const TabNavigation = ({tabs,activeTab,onTabChange}: {tabs: Tab[],activeTab: string,onTabChange: (id: string) => void}) => {
  // 建立一個 ref 物件，用來存放各個子頁籤按鈕
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  // 當使用者點選某個子頁籤時，更新 activeTab 並讓該按鈕捲動到可見區域
  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    tabRefs.current[tabId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'nowrap',
      borderBottom: '1px solid #dee2e6',
      marginBottom: '20px',
      position: 'relative',
      whiteSpace: 'nowrap',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      gap: '8px',
      padding: '0 4px'
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          // 將按鈕元素存入 ref 中
          ref={(el) => { tabRefs.current[tab.id] = el; }}
          onClick={() => handleTabClick(tab.id)}
          style={{
            padding: '12px 16px',
            borderRadius: '4px 4px 0 0',
            backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
            color: activeTab === tab.id ? '#007bff' : '#495057',
            border: 'none',
            borderBottom: activeTab === tab.id ? '3px solid #007bff' : 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: activeTab === tab.id ? '600' : '400',
            transition: 'all 0.2s ease',
            position: 'relative',
            zIndex: 1,
            minWidth: '100px',
            flex: '0 0 auto',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            whiteSpace: 'normal'
          }}
        >
          {tab.icon && (
            <span style={{ flexShrink: 0 }}>{tab.icon}</span>
          )}
          <span style={{
            fontSize: '0.85rem',
            lineHeight: '1.2'
          }}>
            {tab.label}
          </span>
        </button>
      ))}
      {/* 底部動畫指示器，可根據 activeTab 的位置額外實作 */}
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
  
  // Date filter and days selection inputs
  const [customDate, setCustomDate] = useState('');
  const [customDays, setCustomDays] = useState('');
  
  return (
    <Card title="減重數據分析">
<div style={{ marginBottom: '20px' }}>
  <div style={{
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: 'inset 0 0 4px rgba(0,0,0,0.05)',
    marginBottom: '20px'
  }}>
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px'
    }}>
      <h3 style={{
        margin: 0,
        fontSize: '1.1rem',
        color: colors.dark
      }}>
        自訂查詢時間範圍
      </h3>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <p style={{
          margin: 0,
          fontSize: '0.85rem',
          color: '#6c757d'
        }}>
          選擇一種方式設定時間範圍：使用起始日期或設定時間區間天數
        </p>
        
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
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 12px',
            backgroundColor: '#f0f0f0',
            color: colors.dark,
            border: '1px solid #ced4da',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            whiteSpace: 'nowrap'
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
          重置所有篩選條件
        </button>
      </div>
    </div>
    
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '20px'
    }}>
      {/* 左側：選擇起始日期 */}
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
            fontWeight: 'normal'
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
                  type: 'custom',
                  days: 0
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
      
      {/* 右側：設定時間區間天數 */}
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
            fontWeight: 'normal'
          }}>2</div>
          <label htmlFor="customDaysInput" style={{ 
            fontWeight: '500',
            color: '#495057'
          }}>
            設定時間區間 (距今幾天內)
          </label>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          marginBottom: '10px'
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
            
            <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>天</span>
            
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
        
        {/* 快速選擇按鈕 */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          {[
            { days: 7, label: '7天' },
            { days: 14, label: '14天' },
            { days: 30, label: '30天' },
            { days: 60, label: '60天' },
            { days: 90, label: '90天' },
            { days: 180, label: '半年' },
            { days: 365, label: '一年' },
          ].map(day => (
            <button
              key={day.days}
              onClick={() => {
                setCustomDays(day.days.toString());
                const today = new Date();
                const startDate = new Date(today.getTime() - day.days * 24 * 60 * 60 * 1000);
                onDateRangeChange({
                  startDate: startDate.toISOString().split('T')[0],
                  type: 'days',
                  days: day.days
                });
                setCustomDate('');
              }}
              style={{
                padding: '5px 10px',
                backgroundColor: dateRange.days === day.days ? colors.primary : '#e9ecef',
                color: dateRange.days === day.days ? 'white' : '#495057',
                border: 'none',
                borderRadius: '15px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (dateRange.days !== day.days) {
                  e.currentTarget.style.backgroundColor = '#dee2e6';
                }
              }}
              onMouseOut={(e) => {
                if (dateRange.days !== day.days) {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                }
              }}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>
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
                  <span style={{ fontWeight: 'normal' }}>{analysisResults.startDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>分析結束日期</span>
                  <span style={{ fontWeight: 'normal' }}>{analysisResults.endDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>間隔天數</span>
                  <span style={{ fontWeight: 'normal' }}>{analysisResults.daysBetween} 天</span>
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
                  <span style={{ fontWeight: 'normal' }}>{analysisResults.startWeight} kg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>最終體重</span>
                  <span style={{ fontWeight: 'normal' }}>{analysisResults.endWeight} kg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>體重變化</span>
                  <span style={{ 
                    fontWeight: 'normal',
                    color: analysisResults.weightChange > 0 ? colors.danger : colors.success
                  }}>
                    {analysisResults.weightChange > 0 ? '+' : ''}{analysisResults.weightChange} kg
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>體重減少百分比</span>
                  <span style={{ 
                    fontWeight: 'normal',
                    color: analysisResults.weightLossRate > 0 ? colors.success : colors.danger
                  }}>
                    {analysisResults.weightLossRate > 0 ? '' : '-'}{Math.abs(analysisResults.weightLossRate)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>平均每週減重</span>
                  <span style={{ 
                    fontWeight: 'normal',
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
                    fontWeight: 'normal'
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
                        fontWeight: 'normal',
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
                        fontWeight: 'normal',
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
                        fontWeight: 'normal',
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
  const [consultationSubTab, setConsultationSubTab] = useState('newConsultation');
  
  // 趨勢圖顯示數據量選擇
  const [trendDataCount, setTrendDataCount] = useState(5);
  
  // Tab 組件 - 用於顯示頁內分頁
  interface Tab {
    id: string;
    label: string;
    icon?: JSX.Element;
  }

  const TabNavigation = ({tabs,activeTab,onTabChange}: {tabs: Tab[],activeTab: string,onTabChange: (id: string) => void}) => {
    // 建立一個 ref 物件，用來存放各個子頁籤按鈕
    const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    // 當使用者點選某個子頁籤時，更新 activeTab 並讓該按鈕捲動到可見區域
    const handleTabClick = (tabId: string) => {
      onTabChange(tabId);
      tabRefs.current[tabId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    };
    return (
      <div style={{
        display: 'flex',
        flexWrap: 'nowrap',
        borderBottom: '1px solid #dee2e6',
        marginBottom: '20px',
        position: 'relative',
        whiteSpace: 'nowrap',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        gap: '8px',
        padding: '0 4px'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            // 將按鈕元素存入 ref 中
            ref={(el) => { tabRefs.current[tab.id] = el; }}
            onClick={() => handleTabClick(tab.id)}
            style={{
              padding: '12px 16px',
              borderRadius: '4px 4px 0 0',
              backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#007bff' : '#495057',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #007bff' : 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeTab === tab.id ? '600' : '400',
              transition: 'all 0.2s ease',
              position: 'relative',
              zIndex: 1,
              minWidth: '100px',
              flex: '0 0 auto',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'normal'
            }}
          >
            {tab.icon && (
              <span style={{ flexShrink: 0 }}>{tab.icon}</span>
            )}
            <span style={{
              fontSize: '0.85rem',
              lineHeight: '1.2'
            }}>
              {tab.label}
            </span>
          </button>
        ))}
        {/* 底部動畫指示器，可根據 activeTab 的位置額外實作 */}
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
    {
      date: '2024-03-15',
      '肝鬱氣滯型': 2,
      '脾虛濕阻型': 3,
      '氣血虛弱型': 3,
      '胃熱濕阻型': 1,
      '腎陽虛痰濁型': 2,
    },
    {
      date: '2024-04-10',
      '肝鬱氣滯型': 1,
      '脾虛濕阻型': 2,
      '氣血虛弱型': 4,
      '胃熱濕阻型': 2,
      '腎陽虛痰濁型': 3,
    },
    {
      date: '2024-05-05',
      '肝鬱氣滯型': 2,
      '脾虛濕阻型': 1,
      '氣血虛弱型': 3,
      '胃熱濕阻型': 4,
      '腎陽虛痰濁型': 2,
    },
  ];
  
  // Analysis date range filter state
  const [dateRange, setDateRange] = useState({
    startDate: '',
    type: 'all' as 'all' | 'days' | 'custom',
    days: 0
  });
  
  // Consultation date filters
  const [consultationDateRange, setConsultationDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
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
  
  // Consultation form reference for scrolling
  const consultationFormRef = useRef<HTMLFormElement>(null);
  
  // Form management for consultation
  const handleConsultationChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConsultation(prev => ({ ...prev, [name]: value }));
  }, []);
  
  const handleConsultationSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (consultation.id === null) {
      setConsultationRecords(prev => [...prev, { ...consultation, id: Date.now() }]);
    } else {
      setConsultationRecords(prev =>
        prev.map((record) => (record.id === consultation.id ? consultation : record))
      );
    }
    setConsultation({
      id: null,
      preConsultation: '',
      postConsultation: '',
      consultationDate: '',
      consultationType: 'in-person',
    });
  }, [consultation]);
  
  const handleConsultationEdit = useCallback((id: number) => {
    const record = consultationRecords.find((rec) => rec.id === id);
    if (record) {
      setConsultation(record);
      
      // Scroll to consultation form with smooth animation
      setTimeout(() => {
        if (consultationFormRef.current) {
          consultationFormRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
          
          // Highlight the form with a flash effect
          const formElement = consultationFormRef.current;
          formElement.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
          formElement.style.transition = 'background-color 0.5s ease';
          
          setTimeout(() => {
            formElement.style.backgroundColor = 'transparent';
          }, 800);
        }
      }, 100);
    }
  }, [consultationRecords]);
  
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
        font: { size: 16, weight: 700 },
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
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
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
          drawBorder: false,
          lineWidth: 1,
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
        font: { size: 16, weight: 700 },
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
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
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
          drawBorder: false,
          lineWidth: 1,
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
  
  interface BmrChartOptions {
    responsive: boolean;
    maintainAspectRatio: boolean;
    plugins: {
      title: {
        display: boolean;
        text: string;
        font: { size: number; weight: string };
        padding: { bottom: number };
      };
      tooltip: {
        backgroundColor: string;
        titleColor: string;
        bodyColor: string;
        borderColor: string;
        borderWidth: number;
        padding: number;
        cornerRadius: number;
        boxShadow: string;
        callbacks: {
          label: (context: any) => string;
        };
      };
      legend: {
        position: 'top' | 'left' | 'bottom' | 'right' | 'center' | 'chartArea';
        labels: {
          usePointStyle: boolean;
          padding: number;
          font: { size: number };
        };
      };
    };
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)',
          borderDash: [],
        },
        ticks: {
          font: { size: number };
          callback: (value: number) => string;
        };
      };
      x: {
        grid: { display: boolean };
        ticks: {
          font: { size: number };
          maxRotation: number;
          minRotation: number;
        };
      };
    };
  }

  const bmrChartOptions: ChartOptions<'line'> = {    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: '基礎代謝率 (BMR) 趨勢',
        font: { size: 16, weight: 'normal' as 'normal' | 'bold' | 'lighter' | 'bolder' },
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
          label: function (context: { parsed: { y: number }; dataset: { label?: string } }) {
            return `基礎代謝率: ${context.parsed.y} kcal/天`;
          },
        },
      },
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12 },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0,0,0,0.05)',
          lineWidth: 1,
        },
        ticks: {
          font: { size: 12 },
          callback: function (value) {
            return value + ' kcal';
          },
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 45,
        },
      },
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
  };
  
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
    fontWeight: 'normal',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    margin: '0 10px',
  };
  
  // Active tab style
  const getTabButtonStyle = (tab: 'weightData' | 'consultation') => {
    return {
      ...tabButtonStyle,
      backgroundColor: activeTab === tab ? colors.primary : '#f0f0f0',
      color: activeTab === tab ? 'white' : colors.dark,
      transform: activeTab === tab ? 'translateY(-2px)' : 'none',
      boxShadow: activeTab === tab ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
    };
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
      fontWeight: 'normal',
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
      resize: 'vertical' as const,
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
      overflowX: 'auto' as const,
      marginTop: '20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      borderRadius: '8px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as 'collapse',
      fontSize: '0.9rem',
    },
    thead: {
      backgroundColor: colors.primary,
      color: 'white',
    },
    th: {
      padding: '12px 15px',
      textAlign: 'left' as const,
      fontWeight: 'normal',
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
      verticalAlign: 'middle',
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
        whiteSpace: 'nowrap',     // 文字不換行
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '1px',
        backgroundColor: '#f8f9fa',
        padding: '1px',
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
            gap: '5px'
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
             whiteSpace: 'nowrap',     // 文字不換行
            display: 'flex',
            alignItems: 'center', 
            gap: '8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            營養諮詢記錄
          </div>
        </button>
      </div>

      {/* Weight data tab */}
      {activeTab === 'weightData' && (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <h1 style={{ 
              display: 'none', // 添加這行來隱藏標題
              textAlign: 'center',
              color: colors.primary,
              fontSize: '2rem',
              marginBottom: '30px',
              fontWeight: 'normal',
              borderBottom: `3px solid ${colors.primary}`,
              paddingBottom: '10px',
            }}>
              九大數據減重分析
            </h1>
            
            {/* 子頁籤導航 - 支援左右滑動 */}
            <div style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
              <TabNavigation 
              tabs={[
                {
                id: 'overview',
                label: '整體概覽',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                ),
                },
                {
                id: 'records',
                label: '數據記錄',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                ),
                },
                {
                id: 'charts',
                label: '趨勢圖表',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                ),
                },
                {
                id: 'analysis',
                label: '數據分析',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                ),
                },
                {
                id: 'memberInfo',
                label: '會員資訊',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                ),
                },
              ]}
              activeTab={weightDataSubTab}
              onTabChange={setWeightDataSubTab}
              />
            </div>
            
            {/* 整體概覽頁籤 */}
          {weightDataSubTab === 'overview' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              {/* 左側：會員資訊簡要顯示 */}
              <div style={{ flex: '1 1 300px' }}>
                <MemberInfoCard 
                  fiveTypeData={currentFiveTypeData}
                  historicalFiveTypeData={historicalFiveTypeData}
                />
              </div>
              
              {/* 右側：數據分析簡要顯示 */}
              <div style={{ flex: '2 1 700px' }}>
                <DataAnalysisCard 
                  weightRecords={weightRecords}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              </div>
            </div>
          )}
          
          {/* 會員資訊頁籤 */}
          {weightDataSubTab === 'memberInfo' && (
            <div>
              <MemberInfoCard 
                fiveTypeData={currentFiveTypeData}
                historicalFiveTypeData={historicalFiveTypeData}
              />
            </div>
          )}
          
          {/* 數據分析頁籤 */}
          {weightDataSubTab === 'analysis' && (
            <div>
              <DataAnalysisCard 
                weightRecords={weightRecords}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
          )}
          
          {/* 數據記錄頁籤 */}
          {weightDataSubTab === 'records' && (
            <Card title="九大數據詳細紀錄">
              <div style={tableStyles.container}>
                <table style={tableStyles.table}>
                  <thead style={tableStyles.thead}>
                    <tr>
                      <th style={tableStyles.th}>測量日期</th>
                      <th style={tableStyles.th}>BMI</th>
                      <th style={tableStyles.th}>體重 (kg)</th>
                      <th style={tableStyles.th}>體脂肪率 (%)</th>
                      <th style={tableStyles.th}>體脂肪 (kg)</th>
                      <th style={tableStyles.th}>內臟脂肪</th>
                      <th style={tableStyles.th}>水分率 (%)</th>
                      <th style={tableStyles.th}>肌肉量 (kg)</th>
                      <th style={tableStyles.th}>骨礦物量 (kg)</th>
                      <th style={tableStyles.th}>BMR (kcal)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weightRecords.map((record, index) => (
                      <tr 
                        key={record.id} 
                        style={{
                          ...tableStyles.tr,
                          ...(index % 2 === 0 ? tableStyles.trEven : {}),
                        }}
                      >
                        <td style={tableStyles.td}>{record.date}</td>
                        <td style={tableStyles.td}>{record.bmi}</td>
                        <td style={tableStyles.td}>{record.weight}</td>
                        <td style={tableStyles.td}>{record.bodyFat}%</td>
                        <td style={tableStyles.td}>
                          {((record.weight * record.bodyFat) / 100).toFixed(1)}
                        </td>
                        <td style={tableStyles.td}>{record.visceralFat}</td>
                        <td style={tableStyles.td}>{record.waterRate}%</td>
                        <td style={tableStyles.td}>{record.muscleMass}</td>
                        <td style={tableStyles.td}>{record.boneMineral}</td>
                        <td style={tableStyles.td}>{record.bmr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          
          {/* 趨勢圖表頁籤 */}
          {weightDataSubTab === 'charts' && (
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '20px'
            }}>
              <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                <Card title="體組成變化">
                  <div style={{ height: '400px' }}>
                    <LineChart 
                      data={bodyCompositionChartData} 
                      options={bodyCompositionChartOptions} 
                    />
                  </div>
                </Card>
              </div>
              
              <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                <Card title="生理指標變化">
                  <div style={{ height: '400px' }}>
                    <LineChart 
                      data={bodyMetricsChartData} 
                      options={bodyMetricsChartOptions} 
                    />
                  </div>
                </Card>
              </div>
              
              <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                <Card title="基礎代謝率變化">
                  <div style={{ height: '400px' }}>
                    <LineChart 
                      data={bmrChartData} 
                      options={bmrChartOptions} 
                    />
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consultation tab */}
      {activeTab === 'consultation' && (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
          <h1 style={{ 
            display: 'none', // 添加這行來隱藏標題
            textAlign: 'center',
            color: colors.primary,
            fontSize: '2rem',
            marginBottom: '30px',
            fontWeight: 'normal',
            borderBottom: `3px solid ${colors.primary}`,
            paddingBottom: '10px',
          }}>
            營養諮詢記錄
          </h1>
          
          {/* 子頁籤導航 */}
                <TabNavigation 
                tabs={[
                  {
                  id: 'newConsultation',
                  label: '新增/編輯諮詢',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                  },
                  {
                  id: 'records', 
                  label: '諮詢紀錄列表',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                  },
                  {
                  id: 'memberInfo',
                  label: '會員資訊',
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
              },
              {
                id: 'analysis',
                label: '數據分析',
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                      </svg>
              }
            ]}
            activeTab={consultationSubTab}
            onTabChange={(tab) => {
              setConsultationSubTab(tab);
              // 如果有編輯中的諮詢紀錄，並且切換到其他頁面，則清空編輯狀態
              if (tab !== 'newConsultation' && consultation.id !== null) {
                setConsultation({
                  id: null,
                  preConsultation: '',
                  postConsultation: '',
                  consultationDate: '',
                  consultationType: 'in-person',
                });
              }
            }}
          />
          
          {/* 諮詢紀錄列表頁籤 */}
          {consultationSubTab === 'records' && (
            <Card title="諮詢紀錄列表">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end',
                marginBottom: '20px',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <label style={{ marginRight: '10px', fontSize: '0.9rem' }}>
                    起始日期:
                  </label>
                  <input
                    type="date"
                    value={consultationDateRange.startDate}
                    onChange={(e) => setConsultationDateRange(prev => ({
                      ...prev,
                      startDate: e.target.value
                    }))}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid #ced4da',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ marginRight: '10px', fontSize: '0.9rem' }}>
                    結束日期:
                  </label>
                  <input
                    type="date"
                    value={consultationDateRange.endDate}
                    onChange={(e) => setConsultationDateRange(prev => ({
                      ...prev,
                      endDate: e.target.value
                    }))}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid #ced4da',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                
                <button
                  onClick={() => setConsultationDateRange({
                    startDate: '',
                    endDate: ''
                  })}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f8f9fa',
                    color: colors.dark,
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  重置篩選
                </button>
              </div>
              
              {filteredConsultations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {filteredConsultations.map((record) => (
                    <div 
                      key={record.id}
                      style={{
                        padding: '15px',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6',
                        backgroundColor: '#fff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        transition: 'box-shadow 0.2s ease',
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '10px',
                        borderBottom: '1px solid #f0f0f0',
                        paddingBottom: '10px'
                      }}>
                        <div>
                          <span style={{ 
                            backgroundColor: colors.primary,
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            marginRight: '10px'
                          }}>
                            {record.consultationDate}
                          </span>
                          <span style={{ 
                            backgroundColor: (() => {
                              switch(record.consultationType) {
                                case 'in-person': return colors.success;
                                case 'online': return colors.info;
                                case 'phone': return colors.warning;
                                default: return colors.secondary;
                              }
                            })(),
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.8rem'
                          }}>
                            {(() => {
                              switch(record.consultationType) {
                                case 'in-person': return '現場';
                                case 'online': return '線上';
                                case 'phone': return '電話';
                                default: return '其他';
                              }
                            })()}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            handleConsultationEdit(record.id!);
                            setConsultationSubTab('newConsultation');
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f8f9fa',
                            color: colors.dark,
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#007bff';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.border = '1px solid #007bff';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.color = colors.dark;
                            e.currentTarget.style.border = '1px solid #dee2e6';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          onMouseDown={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                          onMouseUp={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          編輯
                        </button>
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: colors.dark }}>諮詢前:</h4>
                        <p style={{ 
                          margin: 0, 
                          backgroundColor: '#f8f9fa',
                          padding: '10px',
                          borderRadius: '6px',
                          whiteSpace: 'pre-line'
                        }}>
                          {record.preConsultation}
                        </p>
                      </div>
                      
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', color: colors.dark }}>諮詢後:</h4>
                        <p style={{ 
                          margin: 0, 
                          backgroundColor: '#f8f9fa',
                          padding: '10px',
                          borderRadius: '6px',
                          whiteSpace: 'pre-line'
                        }}>
                          {record.postConsultation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  padding: '40px 20px', 
                  textAlign: 'center',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  color: colors.muted
                }}>
                  <p style={{ fontSize: '1.1rem', margin: 0 }}>
                    {consultationDateRange.startDate || consultationDateRange.endDate ? 
                      '沒有符合所選日期範圍的諮詢紀錄' : 
                      '尚未有任何諮詢紀錄，請使用「新增/編輯諮詢」頁籤來新增'
                    }
                  </p>
                </div>
              )}
            </Card>
          )}
          
          {/* 新增/編輯諮詢頁籤 */}
          {consultationSubTab === 'newConsultation' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ flex: '1 1 60%' }}>
                <Card title={consultation.id === null ? "新增諮詢紀錄" : "編輯諮詢紀錄"}>
                  <form 
                    ref={consultationFormRef}
                    onSubmit={(e) => {
                      handleConsultationSubmit(e);
                      // 提交成功後切換到諮詢紀錄列表頁籤
                      setConsultationSubTab('records');
                    }}
                    style={{
                      ...formStyles.container,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {consultation.id !== null && (
                      <div style={{
                        backgroundColor: '#e8f4ff',
                        padding: '10px 15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        borderLeft: '4px solid #007bff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span style={{ color: '#0056b3', fontWeight: '500' }}>
                          正在編輯 {new Date(consultation.consultationDate).toLocaleDateString('zh-TW')} 的諮詢紀錄
                        </span>
                      </div>
                    )}
                    
                    <div style={formStyles.formGroup}>
                      <label style={formStyles.label}>
                        <span style={{ color: '#dc3545', marginRight: '4px' }}>*</span>
                        諮詢日期:
                      </label>
                      <input
                        type="date"
                        name="consultationDate"
                        value={consultation.consultationDate}
                        onChange={handleConsultationChange}
                        required
                        style={{
                          ...formStyles.input,
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#80bdff';
                          e.target.style.boxShadow = '0 0 0 0.2rem rgba(0,123,255,.25)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#ced4da';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    
                    <div style={formStyles.formGroup}>
                      <label style={formStyles.label}>
                        <span style={{ color: '#dc3545', marginRight: '4px' }}>*</span>
                        諮詢前:
                      </label>
                      <textarea
                        name="preConsultation"
                        value={consultation.preConsultation}
                        onChange={handleConsultationChange}
                        required
                        style={{
                          ...formStyles.textarea,
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        }}
                        placeholder="記錄諮詢前客戶的狀態、問題或需求..."
                        onFocus={(e) => {
                          e.target.style.borderColor = '#80bdff';
                          e.target.style.boxShadow = '0 0 0 0.2rem rgba(0,123,255,.25)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#ced4da';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    
                    <div style={formStyles.formGroup}>
                      <label style={formStyles.label}>
                        <span style={{ color: '#dc3545', marginRight: '4px' }}>*</span>
                        諮詢後:
                      </label>
                      <textarea
                        name="postConsultation"
                        value={consultation.postConsultation}
                        onChange={handleConsultationChange}
                        required
                        style={{
                          ...formStyles.textarea,
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        }}
                        placeholder="記錄諮詢後的建議、計劃或結論..."
                        onFocus={(e) => {
                          e.target.style.borderColor = '#80bdff';
                          e.target.style.boxShadow = '0 0 0 0.2rem rgba(0,123,255,.25)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#ced4da';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    
                    <div style={formStyles.formGroup}>
                      <label style={formStyles.label}>
                        <span style={{ color: '#dc3545', marginRight: '4px' }}>*</span>
                        諮詢方式:
                      </label>
                      <select
                        name="consultationType"
                        value={consultation.consultationType}
                        onChange={handleConsultationChange}
                        required
                        style={{
                          ...formStyles.select,
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#80bdff';
                          e.target.style.boxShadow = '0 0 0 0.2rem rgba(0,123,255,.25)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#ced4da';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="in-person">現場</option>
                        <option value="online">線上</option>
                        <option value="phone">電話</option>
                        <option value="other">其他</option>
                      </select>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '15px',
                      marginTop: '20px'
                    }}>
                      <button
                        type="submit"
                        style={{
                          padding: '10px 20px',
                          backgroundColor: consultation.id === null ? '#28a745' : '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: '500',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          flex: '1'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = consultation.id === null ? '#218838' : '#0069d9';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.15)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = consultation.id === null ? '#28a745' : '#007bff';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = 'translateY(1px)';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                        }}
                        onMouseUp={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.15)';
                        }}
                      >
                        {consultation.id === null ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            新增諮詢紀錄
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                              <polyline points="17 21 17 13 7 13 7 21"></polyline>
                              <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            儲存編輯變更
                          </>
                        )}
                      </button>
                      
                      {consultation.id !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setConsultation({
                              id: null,
                              preConsultation: '',
                              postConsultation: '',
                              consultationDate: '',
                              consultationType: 'in-person',
                            });
                          }}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#f8f9fa',
                            color: '#6c757d',
                            border: '1px solid #ced4da',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#e2e6ea';
                            e.currentTarget.style.borderColor = '#dae0e5';
                            e.currentTarget.style.color = '#495057';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = '#ced4da';
                            e.currentTarget.style.color = '#6c757d';
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          取消編輯
                        </button>
                      )}
                    </div>
                  </form>
                </Card>
              </div>

              {/* 右側顯示客戶數據摘要 */}
              <div style={{ flex: '1 1 35%' }}>
                <Card title="客戶數據參考">
                  {/* 最新測量資料 */}
                  {weightRecords.length > 0 && (
                    <>
                      <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '15px'
                      }}>
                        <h3 style={{
                          fontSize: '1rem',
                          margin: '0 0 10px 0',
                          color: colors.primary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 3v18h18"></path>
                            <path d="M18.4 8.64 8.78 18.11l-5.08-5.14"></path>
                          </svg>
                          最新測量資料 ({weightRecords[weightRecords.length - 1].date})
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div style={{ 
                            padding: '8px', 
                            backgroundColor: 'white', 
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: colors.muted }}>體重</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'normal', color: colors.dark }}>
                              {weightRecords[weightRecords.length - 1].weight} kg
                            </div>
                          </div>
                          
                          <div style={{ 
                            padding: '8px', 
                            backgroundColor: 'white', 
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: colors.muted }}>BMI</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'normal', color: colors.dark }}>
                              {weightRecords[weightRecords.length - 1].bmi}
                            </div>
                          </div>
                          
                          <div style={{ 
                            padding: '8px', 
                            backgroundColor: 'white', 
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: colors.muted }}>體脂肪率</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'normal', color: colors.dark }}>
                              {weightRecords[weightRecords.length - 1].bodyFat}%
                            </div>
                          </div>
                          
                          <div style={{ 
                            padding: '8px', 
                            backgroundColor: 'white', 
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: colors.muted }}>內臟脂肪</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'normal', color: colors.dark }}>
                              {weightRecords[weightRecords.length - 1].visceralFat}
                            </div>
                          </div>
                          
                          <div style={{ 
                            padding: '8px', 
                            backgroundColor: 'white', 
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: colors.muted }}>肌肉量</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'normal', color: colors.dark }}>
                              {weightRecords[weightRecords.length - 1].muscleMass} kg
                            </div>
                          </div>
                          
                          <div style={{ 
                            padding: '8px', 
                            backgroundColor: 'white', 
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: colors.muted }}>水分率</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'normal', color: colors.dark }}>
                              {weightRecords[weightRecords.length - 1].waterRate}%
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 體重趨勢 */}
                      {weightRecords.length > 1 && (
                        <div style={{
                          backgroundColor: '#f8f9fa',
                          padding: '15px',
                          borderRadius: '8px',
                          marginBottom: '15px'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                          }}>
                            <h3 style={{
                              fontSize: '1rem',
                              margin: 0,
                              color: colors.primary,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                              </svg>
                              體重趨勢圖
                            </h3>
                            
                            {/* 趨勢圖數據顯示選擇 */}
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button
                                onClick={() => setTrendDataCount(5)}
                                style={{
                                  padding: '3px 7px',
                                  fontSize: '0.75rem',
                                  borderRadius: '4px',
                                  border: 'none',
                                  backgroundColor: trendDataCount === 5 ? colors.primary : '#e9ecef',
                                  color: trendDataCount === 5 ? 'white' : '#495057',
                                  cursor: 'pointer'
                                }}
                              >
                                5次
                              </button>
                              <button
                                onClick={() => setTrendDataCount(10)}
                                style={{
                                  padding: '3px 7px',
                                  fontSize: '0.75rem',
                                  borderRadius: '4px',
                                  border: 'none',
                                  backgroundColor: trendDataCount === 10 ? colors.primary : '#e9ecef',
                                  color: trendDataCount === 10 ? 'white' : '#495057',
                                  cursor: 'pointer'
                                }}
                              >
                                10次
                              </button>
                              <button
                                onClick={() => setTrendDataCount(0)}
                                style={{
                                  padding: '3px 7px',
                                  fontSize: '0.75rem',
                                  borderRadius: '4px',
                                  border: 'none',
                                  backgroundColor: trendDataCount === 0 ? colors.primary : '#e9ecef',
                                  color: trendDataCount === 0 ? 'white' : '#495057',
                                  cursor: 'pointer'
                                }}
                              >
                                全部
                              </button>
                            </div>
                          </div>
                          
                          <div style={{ 
                            height: '150px', 
                            marginTop: '10px' 
                          }}>
                            {(() => {
                              // 準備資料
                              const filteredRecords = trendDataCount === 0 
                                ? [...weightRecords] 
                                : [...weightRecords].slice(-Math.min(trendDataCount, weightRecords.length));
                              
                              // 計算每次測量之間的差異
                              const weightDiffs = filteredRecords.map((record, index, array) => {
                                if (index === 0) return null;
                                return +(record.weight - array[index - 1].weight).toFixed(1);
                              }).filter(diff => diff !== null);
                              
                              return (
                                <LineChart
                                  data={{
                                    labels: filteredRecords.map(record => record.date),
                                    datasets: [
                                      {
                                        label: '體重(kg)',
                                        data: filteredRecords.map(record => record.weight),
                                        borderColor: colors.primary,
                                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                                        fill: true,
                                        tension: 0.4,
                                        borderWidth: 2,
                                        pointRadius: 5
                                      }
                                    ]
                                  }}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                      legend: {
                                        display: false
                                      },
                                      tooltip: {
                                        enabled: true,
                                        callbacks: {
                                          label: function(context) {
                                            const index = context.dataIndex;
                                            let label = `體重: ${context.parsed.y} kg`;
                                            
                                            if (index > 0) {
                                              const yValue = context.parsed.y ?? 0;
                                              const previousValue = context.dataset.data[index - 1] ?? 0;
                                              const diff = +(yValue - Number(previousValue)).toFixed(1);
                                              label += `\n變化: ${diff > 0 ? '+' : ''}${diff} kg`;
                                            }
                                            
                                            return label;
                                          },
                                          title: function(tooltipItems) {
                                            return tooltipItems[0].label;
                                          }
                                        },
                                        padding: 10,
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        titleColor: '#333',
                                        bodyColor: '#333',
                                        borderColor: '#ddd',
                                        borderWidth: 1,
                                        displayColors: false
                                      }
                                    },
                                    scales: {
                                      y: {
                                        ticks: {
                                          font: {
                                            size: 12
                                          }
                                        }
                                      },
                                      x: {
                                        ticks: {
                                          font: {
                                            size: 12
                                          },
                                          maxRotation: 45,
                                          minRotation: 45
                                        }
                                      }
                                    }
                                  }}
                                />
                              );
                            })()}
                          </div>
                          
                          {/* 體重變化摘要 */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            marginTop: '15px',
                            padding: '8px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div>
                              <div style={{ fontSize: '0.8rem', color: colors.muted }}>總體重變化</div>
                              <div style={{ 
                                fontSize: '1rem', 
                                fontWeight: 'normal', 
                                color: weightRecords[0].weight - weightRecords[weightRecords.length - 1].weight > 0 ? colors.success : colors.danger 
                              }}>
                                {weightRecords[0].weight - weightRecords[weightRecords.length - 1].weight > 0 ? '-' : '+'}
                                {Math.abs((weightRecords[0].weight - weightRecords[weightRecords.length - 1].weight)).toFixed(1)} kg
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', color: colors.muted }}>體脂率變化</div>
                              <div style={{ 
                                fontSize: '1rem', 
                                fontWeight: 'normal', 
                                color: weightRecords[0].bodyFat - weightRecords[weightRecords.length - 1].bodyFat > 0 ? colors.success : colors.danger 
                              }}>
                                {weightRecords[0].bodyFat - weightRecords[weightRecords.length - 1].bodyFat > 0 ? '-' : '+'}
                                {Math.abs((weightRecords[0].bodyFat - weightRecords[weightRecords.length - 1].bodyFat)).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 健康目標與里程碑 */}
                      <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '15px'
                      }}>
                        <h3 style={{
                          fontSize: '1rem',
                          margin: '0 0 10px 0',
                          color: colors.primary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="8" r="7"></circle>
                            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                          </svg>
                          健康目標與成就
                        </h3>
                        
                        {(() => {
                          const firstRecord = weightRecords[0];
                          const latestRecord = weightRecords[weightRecords.length - 1];
                          const weightDiff = firstRecord.weight - latestRecord.weight;
                          const bodyFatDiff = firstRecord.bodyFat - latestRecord.bodyFat;
                          
                          // 計算目標BMI (23 為中等BMI)
                          const height = 167 / 100; // 假設身高167cm
                          const goalWeight = 23 * (height * height);
                          const weightToLose = Math.max(0, latestRecord.weight - goalWeight).toFixed(1);
                          
                          return (
                            <div>
                              {/* 已達成的成就 */}
                              <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'normal', marginBottom: '6px' }}>
                                  已達成：
                                </div>
                                <div style={{ 
                                  display: 'flex', 
                                  flexWrap: 'wrap', 
                                  gap: '8px'
                                }}>
                                  {weightDiff > 0 && (
                                    <div style={{ 
                                      padding: '5px 10px', 
                                      backgroundColor: colors.success, 
                                      color: 'white', 
                                      borderRadius: '15px',
                                      fontSize: '0.8rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                      減重 {weightDiff.toFixed(1)} kg
                                    </div>
                                  )}
                                  
                                  {bodyFatDiff > 0 && (
                                    <div style={{ 
                                      padding: '5px 10px', 
                                      backgroundColor: colors.success, 
                                      color: 'white', 
                                      borderRadius: '15px',
                                      fontSize: '0.8rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                      體脂率降低 {bodyFatDiff.toFixed(1)}%
                                    </div>
                                  )}
                                  
                                  {latestRecord.weight < firstRecord.weight * 0.95 && (
                                    <div style={{ 
                                      padding: '5px 10px', 
                                      backgroundColor: colors.info, 
                                      color: 'white', 
                                      borderRadius: '15px',
                                      fontSize: '0.8rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                      </svg>
                                      減重超過5%
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* 下一個目標 */}
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'normal', marginBottom: '6px' }}>
                                  下一個目標：
                                </div>
                                <div style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  gap: '8px'
                                }}>
                                  {Number(weightToLose) > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ 
                                        width: '24px', 
                                        height: '24px', 
                                        backgroundColor: colors.warning, 
                                        color: 'white', 
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.7rem',
                                        fontWeight: 'normal'
                                      }}>
                                        1
                                      </div>
                                      <div>再減 {weightToLose} kg 到達理想BMI (23)</div>
                                    </div>
                                  )}
                                  
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ 
                                      width: '24px', 
                                      height: '24px', 
                                      backgroundColor: colors.warning, 
                                      color: 'white', 
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.7rem',
                                      fontWeight: 'normal'
                                    }}>
                                      {Number(weightToLose) > 0 ? '2' : '1'}
                                    </div>
                                    <div>將體脂率降至 {Math.max(latestRecord.bodyFat - 2, 15).toFixed(1)}%</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* 回訪提醒與預測 */}
                      <div style={{
                        backgroundColor: '#f0f7ff',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '15px',
                        border: '1px solid #cce5ff'
                      }}>
                        <h3 style={{
                          fontSize: '1rem',
                          margin: '0 0 10px 0',
                          color: '#0056b3',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0056b3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          黏著度提升建議
                        </h3>
                        
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ 
                            padding: '10px', 
                            backgroundColor: 'white', 
                            borderRadius: '6px',
                            margin: '0 0 8px 0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'normal', color: colors.primary, marginBottom: '4px' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                              下次回訪建議
                            </div>
                            <div>建議下次回訪時間：{
                              (() => {
                                const lastDate = new Date(weightRecords[weightRecords.length - 1].date);
                                lastDate.setDate(lastDate.getDate() + 7);
                                return lastDate.toLocaleDateString('zh-TW');
                              })()
                            }</div>
                          </div>

                          <div style={{ 
                            padding: '10px', 
                            backgroundColor: 'white', 
                            borderRadius: '6px',
                            margin: '0 0 8px 0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'normal', color: colors.warning, marginBottom: '4px' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                              </svg>
                              個性化建議
                            </div>
                            <div>客戶已有良好進展，可考慮在完成每個階段目標時贈送小獎勵或打卡紀念禮，提高黏著度</div>
                          </div>
                        </div>
                        
                        {(() => {
                          // 簡單預測下一個月的體重
                          const lastRecord = weightRecords[weightRecords.length - 1];
                          const firstRecord = weightRecords[0];
                          
                          // 計算每天平均減重
                          const days = (new Date(lastRecord.date).getTime() - new Date(firstRecord.date).getTime()) / (1000 * 60 * 60 * 24);
                          const avgDailyLoss = days > 0 ? (firstRecord.weight - lastRecord.weight) / days : 0;
                          
                          // 預測30天後
                          const predictedWeight = Math.max(lastRecord.weight - (avgDailyLoss * 30), lastRecord.weight * 0.85).toFixed(1);
                          
                          return (
                            <div style={{ 
                              padding: '10px', 
                              backgroundColor: 'white', 
                              borderRadius: '6px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 'normal', color: colors.info, marginBottom: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                預測與激勵
                              </div>
                              <div>以目前減重速度，30天後預計體重可達：<strong>{predictedWeight} kg</strong></div>
                              <div style={{ 
                                marginTop: '8px', 
                                padding: '5px 10px', 
                                backgroundColor: '#e8f4ff', 
                                borderRadius: '4px', 
                                fontSize: '0.85rem',
                                borderLeft: '3px solid #007bff'
                              }}>
                                如持續保持現有減重速度，預計 {Math.ceil(lastRecord.weight / avgDailyLoss)} 天後可達目標體重！
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* 五型體質 */}
                      <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '15px',
                        borderRadius: '8px'
                      }}>
                        <h3 style={{
                          fontSize: '1rem',
                          margin: '0 0 10px 0',
                          color: colors.primary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
                          </svg>
                          五型體質摘要
                        </h3>
                        
                        <div style={{ padding: '10px' }}>
                          {currentFiveTypeData.map((item, index) => (
                            <div key={index} style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              marginBottom: '8px' 
                            }}>
                              <div style={{ 
                                width: '12px', 
                                height: '12px', 
                                backgroundColor: colors.chartColors[index % colors.chartColors.length],
                                borderRadius: '50%',
                                marginRight: '8px'
                              }}></div>
                              <div style={{ flex: 1 }}>{item.subject}</div>
                              <div style={{ 
                                backgroundColor: item.score > 3 ? colors.warning : colors.light,
                                color: item.score > 3 ? 'white' : colors.dark,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.8rem',
                                fontWeight: 'normal'
                              }}>
                                {item.score}
                              </div>
                            </div>
                          ))}
                          
                          {/* 體質建議 */}
                          <div style={{ 
                            marginTop: '10px',
                            padding: '8px',
                            backgroundColor: '#fff3e0',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            borderLeft: '3px solid #ff9800'
                          }}>
                            {(() => {
                              // 找出分數最高的體質
                              const maxScore = Math.max(...currentFiveTypeData.map(item => item.score));
                              const dominantType = currentFiveTypeData.find(item => item.score === maxScore);
                              
                              switch(dominantType?.subject) {
                                case '肝鬱氣滯型':
                                  return '建議多食清淡食物，避免油膩與刺激性食品，搭配輕度伸展活動';
                                case '脾虛濕阻型':
                                  return '建議控制澱粉攝取，增加低脂高蛋白，少量多餐，飯後適度散步';
                                case '氣血虛弱型':
                                  return '建議增加鐵質與蛋白質食物，小火慢燉食物更易吸收，適度補充維生素';
                                case '胃熱濕阻型':
                                  return '建議多食冷涼食物，減少油炸與辛辣，增加蔬果纖維，多喝水';
                                case '腎陽虛痰濁型':
                                  return '建議食物溫熱且容易消化，少飲冷飲，多攝取優質蛋白，避免過度勞累';
                                default:
                                  return '請根據體質特點調整飲食與生活習慣，並定期評估變化';
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </div>
            </div>
          )}
          
          {/* 會員資訊頁籤 */}
          {consultationSubTab === 'memberInfo' && (
            <MemberInfoCard 
              fiveTypeData={currentFiveTypeData}
              historicalFiveTypeData={historicalFiveTypeData}
            />
          )}
          
          {/* 數據分析頁籤 */}
          {consultationSubTab === 'analysis' && (
            <DataAnalysisCard 
              weightRecords={weightRecords}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          )}
        </div>
      )}
    </div>
  );
}
