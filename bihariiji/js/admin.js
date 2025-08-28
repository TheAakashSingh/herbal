(function () {
	'use strict';

	var STORAGE_KEY = 'winnersData';
	var PAGE_SIZE = 10;
	var state = { data: [], filtered: [], page: 1 };

	function byId(id) { return document.getElementById(id); }

	function readLocal() {
		try {
			var raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return [];
			var parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) return [];
			return parsed;
		} catch (e) {
			console.error('Failed reading localStorage', e);
			return [];
		}
	}

	function writeLocal(rows) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(rows || []));
	}

	function normalizeRow(r) {
		return {
			id: r.ID || r.Id || r.id || '',
			phone: r.Phone || r['Phone No'] || r.Mobile || r.phone || '',
			name: r.Name || r.FullName || r.name || '',
			address: r.Address || r.address || '',
			paid: r.Paid || r.paid || r.Amount || '',
			product: r.Product || r.product || '',
			prizeAmount: r.PrizeAmount || r['Prize Amount'] || r.prizeAmount || r.Amount || '',
			date: r.Date || r.date || '',
			status: r.Status || r.status || '',
			wcode: r.WCode || r['W-Code'] || r.wcode || ''
		};
	}

	function setData(rows) {
		state.data = rows.map(normalizeRow);
		state.page = 1;
		applyFilter();
		writeLocal(state.data);
	}

	function applyFilter() {
		var q = byId('searchInput').value.trim().toLowerCase();
		if (!q) {
			state.filtered = state.data.slice();
		} else {
			state.filtered = state.data.filter(function (r) {
				return String(r.phone).toLowerCase().includes(q) ||
					String(r.name).toLowerCase().includes(q) ||
					String(r.wcode).toLowerCase().includes(q);
			});
		}
		renderTable();
	}

	function fmt(v) { return v == null ? '' : v; }

	function renderTable() {
		var tbody = document.querySelector('#winnersTable tbody');
		tbody.innerHTML = '';
		var start = (state.page - 1) * PAGE_SIZE;
		var end = Math.min(start + PAGE_SIZE, state.filtered.length);
		for (var i = start; i < end; i++) {
			var r = state.filtered[i];
			var tr = document.createElement('tr');
			tr.innerHTML = '<td>' + fmt(r.id) + '</td>' +
				'<td>' + fmt(r.phone) + '</td>' +
				'<td>' + fmt(r.name) + '</td>' +
				'<td>' + fmt(r.address) + '</td>' +
				'<td>' + fmt(r.paid) + '</td>' +
				'<td>' + fmt(r.product) + '</td>' +
				'<td>' + fmt(r.prizeAmount) + '</td>' +
				'<td>' + fmt(r.date) + '</td>' +
				'<td>' + fmt(r.status) + '</td>' +
				'<td>' + fmt(r.wcode) + '</td>';
			tbody.appendChild(tr);
		}

		var rowsInfo = byId('rowsInfo');
		rowsInfo.textContent = state.filtered.length ?
			('Showing ' + (start + 1) + '–' + end + ' of ' + state.filtered.length) : 'No rows';

		renderPagination();
	}

	function renderPagination() {
		var pages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
		if (state.page > pages) state.page = pages;
		var ul = byId('pagination');
		ul.innerHTML = '';

		function add(label, page, disabled, active) {
			var li = document.createElement('li');
			li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
			var a = document.createElement('a');
			a.className = 'page-link';
			a.href = '#';
			a.textContent = label;
			a.addEventListener('click', function (ev) { ev.preventDefault(); if (!disabled) { state.page = page; renderTable(); } });
			li.appendChild(a);
			ul.appendChild(li);
		}

		add('«', 1, state.page === 1, false);
		add('‹', Math.max(1, state.page - 1), state.page === 1, false);
		for (var p = 1; p <= pages; p++) { add(String(p), p, false, p === state.page); }
		add('›', Math.min(pages, state.page + 1), state.page === pages, false);
		add('»', pages, state.page === pages, false);
	}

	function importExcel(file) {
		var reader = new FileReader();
		reader.onload = function (e) {
			try {
				var data = new Uint8Array(e.target.result);
				var workbook = XLSX.read(data, { type: 'array' });
				var sheetName = workbook.SheetNames[0];
				var json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
				setData(json);
				Swal.fire({ icon: 'success', title: 'Imported', text: 'Rows imported: ' + json.length });
			} catch (err) {
				console.error(err);
				Swal.fire({ icon: 'error', title: 'Import failed', text: 'Invalid Excel file.' });
			}
		};
		reader.readAsArrayBuffer(file);
	}

	function exportCsv() {
		var rows = state.filtered;
		if (!rows.length) { Swal.fire({ icon: 'info', title: 'No data to export' }); return; }
		var header = ['ID','Phone','Name','Address','Paid','Product','Prize Amount','Date','Status','W-Code'];
		var csv = [header.join(',')].concat(rows.map(function(r){
			return [r.id,r.phone,r.name,r.address,r.paid,r.product,r.prizeAmount,r.date,r.status,r.wcode]
				.map(function(x){
					var s = String(x==null?'':x);
					if (s.includes('"') || s.includes(',') || s.includes('\n')) s = '"' + s.replace(/"/g,'""') + '"';
					return s;
				}).join(',');
		})).join('\n');
		var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		var a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'winners.csv';
		a.click();
	}

	function init() {
		// sidebar toggle for mobile
		var toggle = document.getElementById('sidebarToggle');
		if (toggle) {
			toggle.addEventListener('click', function(){
				var sb = document.getElementById('sidebar');
				if (sb) sb.classList.toggle('open');
			});
		}

		// load existing
		state.data = readLocal();
		state.filtered = state.data.slice();
		renderTable();

		byId('btnImport').addEventListener('click', function(){
			var f = byId('excelFile').files[0];
			if (!f) { Swal.fire({ icon: 'warning', title: 'Choose a file first' }); return; }
			importExcel(f);
		});

		byId('searchInput').addEventListener('input', function(){ state.page = 1; applyFilter(); });
		byId('btnClearSearch').addEventListener('click', function(){ byId('searchInput').value=''; state.page=1; applyFilter(); });
		byId('btnExport').addEventListener('click', exportCsv);
	}

	document.addEventListener('DOMContentLoaded', init);
})();


