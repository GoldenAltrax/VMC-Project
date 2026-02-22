import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { WeeklyScheduleResponse, ProjectWithDetails, Machine } from '../types';

type ExcelCell = string | number | null | undefined;
type ExcelRow = ExcelCell[];

// Excel Export Functions

export function exportWeeklyScheduleToExcel(schedule: WeeklyScheduleResponse): void {
  const wb = XLSX.utils.book_new();

  // Create main schedule sheet
  const scheduleData: ExcelRow[] = [];

  // Header row
  const header = ['Machine'];
  const days = schedule.machines[0]?.days || [];
  days.forEach(day => {
    header.push(day.day_name);
  });
  header.push('Weekly Planned', 'Weekly Actual');
  scheduleData.push(header);

  // Data rows
  schedule.machines.forEach(machine => {
    const row: ExcelRow = [machine.machine_name];
    machine.days.forEach(day => {
      const entries = day.entries.map(e =>
        `${e.load_name || e.project_name || 'Untitled'} (${e.planned_hours}h/${e.actual_hours ?? '-'}h)`
      ).join('\n');
      row.push(entries || '-');
    });
    row.push(`${machine.weekly_planned_hours.toFixed(1)}h`);
    row.push(`${machine.weekly_actual_hours.toFixed(1)}h`);
    scheduleData.push(row);
  });

  // Summary row
  const summaryRow = ['TOTAL'];
  days.forEach(day => {
    const totalPlanned = schedule.machines.reduce((sum, m) =>
      sum + (m.days.find(d => d.date === day.date)?.total_planned_hours || 0), 0);
    const totalActual = schedule.machines.reduce((sum, m) =>
      sum + (m.days.find(d => d.date === day.date)?.total_actual_hours || 0), 0);
    summaryRow.push(`${totalPlanned.toFixed(1)}h / ${totalActual.toFixed(1)}h`);
  });
  const totalPlanned = schedule.machines.reduce((sum, m) => sum + m.weekly_planned_hours, 0);
  const totalActual = schedule.machines.reduce((sum, m) => sum + m.weekly_actual_hours, 0);
  summaryRow.push(`${totalPlanned.toFixed(1)}h`);
  summaryRow.push(`${totalActual.toFixed(1)}h`);
  scheduleData.push(summaryRow);

  const ws = XLSX.utils.aoa_to_sheet(scheduleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 },
    ...days.map(() => ({ wch: 25 })),
    { wch: 15 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Weekly Schedule');

  // Save file
  const filename = `VMC_Weekly_Schedule_${schedule.week_start}_to_${schedule.week_end}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportProjectsToExcel(projects: ProjectWithDetails[]): void {
  const wb = XLSX.utils.book_new();

  const data: ExcelRow[] = [
    ['Project Name', 'Client', 'Status', 'Start Date', 'End Date', 'Planned Hours', 'Actual Hours', 'Progress %'],
  ];

  projects.forEach(project => {
    data.push([
      project.name,
      project.client_name || '-',
      project.status,
      project.start_date || '-',
      project.end_date || '-',
      project.planned_hours,
      project.actual_hours,
      `${project.progress_percentage}%`,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Projects');
  XLSX.writeFile(wb, `VMC_Projects_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportMachinesToExcel(machines: Machine[]): void {
  const wb = XLSX.utils.book_new();

  const data: ExcelRow[] = [
    ['Name', 'Model', 'Status', 'Location', 'Capacity', 'Serial Number'],
  ];

  machines.forEach(machine => {
    data.push([
      machine.name,
      machine.model,
      machine.status,
      machine.location || '-',
      machine.capacity || '-',
      machine.serial_number || '-',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 20 },
    { wch: 25 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Machines');
  XLSX.writeFile(wb, `VMC_Machines_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// PDF Export Functions

export function exportWeeklyScheduleToPDF(schedule: WeeklyScheduleResponse): void {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Title
  doc.setFontSize(18);
  doc.text('VMC Weekly Schedule', 14, 22);

  doc.setFontSize(10);
  doc.text(`Week: ${schedule.week_start} to ${schedule.week_end}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

  // Prepare table data
  const days = schedule.machines[0]?.days || [];
  const headers = ['Machine', ...days.map(d => d.day_name), 'Planned', 'Actual'];

  const body = schedule.machines.map(machine => {
    const row = [machine.machine_name];
    machine.days.forEach(day => {
      const entries = day.entries.map(e =>
        `${e.load_name || e.project_name || '-'}\n${e.planned_hours}h`
      ).join('\n---\n');
      row.push(entries || '-');
    });
    row.push(`${machine.weekly_planned_hours.toFixed(1)}h`);
    row.push(`${machine.weekly_actual_hours.toFixed(1)}h`);
    return row;
  });

  // Add summary row
  const summaryRow = ['TOTAL'];
  days.forEach(day => {
    const total = schedule.machines.reduce((sum, m) =>
      sum + (m.days.find(d => d.date === day.date)?.total_planned_hours || 0), 0);
    summaryRow.push(`${total.toFixed(1)}h`);
  });
  const totalPlanned = schedule.machines.reduce((sum, m) => sum + m.weekly_planned_hours, 0);
  const totalActual = schedule.machines.reduce((sum, m) => sum + m.weekly_actual_hours, 0);
  summaryRow.push(`${totalPlanned.toFixed(1)}h`);
  summaryRow.push(`${totalActual.toFixed(1)}h`);
  body.push(summaryRow);

  autoTable(doc, {
    head: [headers],
    body: body,
    startY: 42,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      0: { cellWidth: 30 },
    },
    didParseCell: (data) => {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [243, 244, 246];
      }
    },
  });

  doc.save(`VMC_Weekly_Schedule_${schedule.week_start}.pdf`);
}

export function exportProjectsToPDF(projects: ProjectWithDetails[]): void {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text('VMC Projects Report', 14, 22);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

  // Prepare table data
  const headers = ['Project', 'Client', 'Status', 'Planned', 'Actual', 'Progress'];
  const body = projects.map(project => [
    project.name,
    project.client_name || '-',
    project.status,
    `${project.planned_hours}h`,
    `${project.actual_hours}h`,
    `${project.progress_percentage}%`,
  ]);

  autoTable(doc, {
    head: [headers],
    body: body,
    startY: 36,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  // Summary
  const totalPlanned = projects.reduce((sum, p) => sum + p.planned_hours, 0);
  const totalActual = projects.reduce((sum, p) => sum + p.actual_hours, 0);
  const avgProgress = projects.length > 0
    ? (projects.reduce((sum, p) => sum + p.progress_percentage, 0) / projects.length).toFixed(0)
    : 0;

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.text(`Total Projects: ${projects.length}`, 14, finalY);
  doc.text(`Total Planned Hours: ${totalPlanned}h`, 14, finalY + 6);
  doc.text(`Total Actual Hours: ${totalActual}h`, 14, finalY + 12);
  doc.text(`Average Progress: ${avgProgress}%`, 14, finalY + 18);

  doc.save(`VMC_Projects_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportMachinesToPDF(machines: Machine[]): void {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text('VMC Machines Report', 14, 22);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

  // Prepare table data
  const headers = ['Name', 'Model', 'Status', 'Location', 'Capacity'];
  const body = machines.map(machine => [
    machine.name,
    machine.model,
    machine.status,
    machine.location || '-',
    machine.capacity || '-',
  ]);

  autoTable(doc, {
    head: [headers],
    body: body,
    startY: 36,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
    didParseCell: (data) => {
      if (data.column.index === 2) {
        const status = data.cell.text[0];
        if (status === 'active') {
          data.cell.styles.textColor = [34, 197, 94];
        } else if (status === 'maintenance') {
          data.cell.styles.textColor = [59, 130, 246];
        } else if (status === 'error') {
          data.cell.styles.textColor = [239, 68, 68];
        } else if (status === 'idle') {
          data.cell.styles.textColor = [234, 179, 8];
        }
      }
    },
  });

  // Summary
  const statusCounts = {
    active: machines.filter(m => m.status === 'active').length,
    idle: machines.filter(m => m.status === 'idle').length,
    maintenance: machines.filter(m => m.status === 'maintenance').length,
    error: machines.filter(m => m.status === 'error').length,
  };

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.text(`Total Machines: ${machines.length}`, 14, finalY);
  doc.text(`Active: ${statusCounts.active} | Idle: ${statusCounts.idle} | Maintenance: ${statusCounts.maintenance} | Error: ${statusCounts.error}`, 14, finalY + 6);

  doc.save(`VMC_Machines_${new Date().toISOString().split('T')[0]}.pdf`);
}
