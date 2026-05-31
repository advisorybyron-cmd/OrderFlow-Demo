'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { format, parseISO, startOfWeek, getWeek } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface DailyStat {
  date: string
  dayName: string
  dayDate: string
  totalItems: number
  hoursWorked: number
  shirtsPerMinute: number
}

interface ReportData {
  weekStart: string
  weekEnd: string
  dailyStats: DailyStat[]
  summary: {
    totalItems: number
    totalHours: number
    avgShirtsPerMinute: number
    prevWeekTotal: number
    changePercent: number
  }
  employees: Array<{
    id: string
    name: string
    employee_code: string
    avatar_url: string | null
  }>
}

// Generate last 12 weeks options
function getWeekOptions() {
  const options = []
  const today = new Date()
  for (let i = 0; i < 12; i++) {
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - today.getDay() - i * 7)
    const weekNum = getWeek(sunday, { weekStartsOn: 0 })
    const weekStart = format(sunday, 'MMM d')
    const weekEnd = format(new Date(sunday.getTime() + 6 * 24 * 60 * 60 * 1000), 'd MMM')
    options.push({
      value: format(sunday, 'yyyy-MM-dd'),
      label: `WEEK ${String(weekNum).padStart(2, '0')} - ${weekStart}-${weekEnd}`,
    })
  }
  return options
}

export function PressEmployeeReport() {
  const weekOptions = useMemo(() => getWeekOptions(), [])

  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [selectedWeek, setSelectedWeek] = useState<string>(weekOptions[0]?.value ?? '')
  const [submittedEmployee, setSubmittedEmployee] = useState<string>('')
  const [submittedWeek, setSubmittedWeek] = useState<string>(weekOptions[0]?.value ?? '')
  const [submitted, setSubmitted] = useState(false)

  // Fetch employee list first (no filter)
  const { data: employeeData } = useSWR<ReportData>(
    `/api/reports?weekStart=${submittedWeek}`,
    fetcher
  )

  // Fetch report for selected employee (or all employees)
  const { data, isLoading } = useSWR<ReportData>(
    submitted
      ? `/api/reports?${submittedEmployee !== 'all' ? `employeeId=${submittedEmployee}&` : ''}weekStart=${submittedWeek}`
      : null,
    fetcher
  )

  const handleSubmit = () => {
    setSubmittedEmployee(selectedEmployee)
    setSubmittedWeek(selectedWeek)
    setSubmitted(true)
  }

  const employee = employeeData?.employees?.find(e => e.id === submittedEmployee)
  const isAllEmployees = submittedEmployee === 'all'

  // Build day columns Sun-Sat
  const days = data?.dailyStats ?? []

  // Calculate shirts per hour
  const totalItems = data?.summary.totalItems ?? 0
  const totalHours = data?.summary.totalHours ?? 0
  const shirtsPerHour = totalItems > 0 && totalHours > 0
    ? (totalItems / totalHours).toFixed(2)
    : null

  const prevWeekTotal = data?.summary.prevWeekTotal ?? 0

  return (
    <div className="mt-8 border-t pt-8">
      <h2 className="text-center font-bold text-lg uppercase tracking-wide mb-4">
        Press Employee Report
      </h2>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <select
          className="border border-gray-400 text-sm px-2 py-1 rounded bg-white"
          value={selectedEmployee}
          onChange={e => setSelectedEmployee(e.target.value)}
        >
          <option value="all">All Employees</option>
          {employeeData?.employees?.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>

        <select
          className="border border-gray-400 text-sm px-2 py-1 rounded bg-white"
          value={selectedWeek}
          onChange={e => setSelectedWeek(e.target.value)}
        >
          {weekOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <button
          onClick={handleSubmit}
          className="bg-black text-white font-bold text-sm px-4 py-1 rounded uppercase"
        >
          Submit
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-blue-100">
              <th className="border border-gray-400 px-3 py-2 text-left font-bold">NAME</th>
              {days.map(day => (
                <th key={day.date} className="border border-gray-400 px-3 py-2 text-center font-bold min-w-[90px]">
                  {day.dayName}<br />
                  <span className="font-normal">{day.dayDate}</span>
                </th>
              ))}
              <th className="border border-gray-400 px-3 py-2 text-center font-bold uppercase min-w-[100px]">Totals</th>
              <th className="border border-gray-400 px-3 py-2 text-center font-bold uppercase min-w-[110px]">Previous Week</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="border border-gray-400 px-3 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : !submitted ? (
              <tr>
                <td colSpan={10} className="border border-gray-400 px-3 py-4 text-center text-gray-500">
                  Select an employee and week, then click Submit.
                </td>
              </tr>
            ) : (
              <tr className="bg-blue-50">
                {/* Employee info cell */}
                <td className="border border-gray-400 px-3 py-3 align-top">
                  <div className="font-bold">{isAllEmployees ? 'All Employees' : (employee?.name ?? '-')}</div>
                  {totalHours > 0 && (
                    <div className="text-gray-700">{totalHours.toFixed(2)} hrs</div>
                  )}
                  {shirtsPerHour && (
                    <div className="text-gray-700">{shirtsPerHour} s/h</div>
                  )}
                </td>

                {/* Day cells */}
                {days.map(day => {
                  const dailyShirtsPerHour = day.totalItems > 0 && day.hoursWorked > 0
                    ? (day.totalItems / day.hoursWorked).toFixed(2)
                    : '0'
                  return (
                    <td key={day.date} className="border border-gray-400 px-3 py-3 text-center align-top">
                      <div className="font-bold">{day.totalItems > 0 ? day.totalItems : 0} SHIRTS</div>
                      <div className="text-gray-700">{day.hoursWorked > 0 ? day.hoursWorked.toFixed(2) : '0'} hrs</div>
                      <div className="text-gray-700">{dailyShirtsPerHour} s/h</div>
                    </td>
                  )
                })}

                {/* Totals cell */}
                <td className="border border-gray-400 px-3 py-3 text-center align-top">
                  {totalItems > 0 ? (
                    <>
                      <div className="font-bold">{totalItems} SHIRTS</div>
                      {totalHours > 0 && (
                        <div className="text-gray-700">{totalHours.toFixed(2)} hrs</div>
                      )}
                      {shirtsPerHour && (
                        <div className="text-gray-700">{shirtsPerHour} s/h</div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-500">-</div>
                  )}
                </td>

                {/* Previous week cell */}
                <td className="border border-gray-400 px-3 py-3 text-center align-top">
                  {prevWeekTotal > 0 ? (
                    <div className="font-bold">{prevWeekTotal} SHIRTS</div>
                  ) : (
                    <div className="text-gray-500">-</div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


    </div>
  )
}
