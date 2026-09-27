import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AddMedicamentoScreen extends StatefulWidget {
  final Map<String, dynamic>? medicamentoParaEditar;

  const AddMedicamentoScreen({super.key, this.medicamentoParaEditar});

  @override
  State<AddMedicamentoScreen> createState() => _AddMedicamentoScreenState();
}

class _AddMedicamentoScreenState extends State<AddMedicamentoScreen> {
  final _nomeController = TextEditingController();
  final _dosagemController = TextEditingController();
  final _horaController = TextEditingController();
  final _frequenciaController = TextEditingController();
  final _limiteAtrasoController = TextEditingController();

  bool _isLoading = false;
  final supabase = Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    // Se estivermos a editar, preenchemos os campos com os valores atuais do Supabase
    if (widget.medicamentoParaEditar != null) {
      final med = widget.medicamentoParaEditar!;
      _nomeController.text = med['nome_farmaco'] ?? '';
      _dosagemController.text = med['dosagem'] ?? '';
      _horaController.text = med['hora_inicio'] != null
          ? med['hora_inicio'].toString().substring(0, 5)
          : '';
      _frequenciaController.text = med['frequencia_horas']?.toString() ?? '';
      _limiteAtrasoController.text =
          med['limite_atraso_minutos']?.toString() ?? '';
    }
  }

  Future<void> _salvarMedicamento() async {
    setState(() => _isLoading = true);

    // 1. INICIA O CRONÔMETRO EXATAMENTE ANTES DA LÓGICA COMEÇAR
    final stopwatch = Stopwatch()..start();

    try {
      // Converte os valores numéricos com segurança
      final int? frequenciaHoras = int.tryParse(
        _frequenciaController.text.trim(),
      );
      final int? limiteAtrasoMinutos = int.tryParse(
        _limiteAtrasoController.text.trim(),
      );

      final dadosFormulario = {
        'nome_farmaco': _nomeController.text.trim(),
        'dosagem': _dosagemController.text.trim(),
        'hora_inicio': _horaController.text.trim().isEmpty
            ? null
            : _horaController.text.trim(),
        'frequencia_horas': frequenciaHoras,
        'limite_atraso_minutos': limiteAtrasoMinutos,
        'id_paciente': 1, // Mantém vinculado ao paciente atual
      };

      if (widget.medicamentoParaEditar == null) {
        // MODO CADASTRO (INSERT)
        await supabase.from('medicamento').insert(dadosFormulario);
      } else {
        // MODO EDIÇÃO (UPDATE)
        final id = widget.medicamentoParaEditar!['id_medicamento'];
        await supabase
            .from('medicamento')
            .update(dadosFormulario)
            .eq('id_medicamento', id);
      }

      // 2. PARA O CRONÔMETRO LOGO APÓS O BANCO DE DADOS RESPONDER
      stopwatch.stop();

      // 3. IMPRIME O TEMPO NO TERMINAL (DEBUG CONSOLE)
      print(
        '>>> TEMPO CT01 (AGENDAMENTO SUPABASE): ${stopwatch.elapsedMilliseconds} ms <<<',
      );

      if (mounted) Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao salvar: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  final TextStyle _labelStyle = const TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Color(0xFF64748B),
    letterSpacing: 1.0,
  );

  @override
  Widget build(BuildContext context) {
    final bool isEditando = widget.medicamentoParaEditar != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditando ? 'Editar Medicamento' : 'Novo Medicamento'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('NOME DO REMÉDIO', style: _labelStyle),
            const SizedBox(height: 8),
            TextField(
              controller: _nomeController,
              decoration: const InputDecoration(hintText: 'ex: Dipirona'),
            ),
            const SizedBox(height: 20),

            Text('DOSAGEM', style: _labelStyle),
            const SizedBox(height: 8),
            TextField(
              controller: _dosagemController,
              decoration: const InputDecoration(hintText: 'ex: 500mg'),
            ),
            const SizedBox(height: 20),

            Text('HORÁRIO DA PRIMEIRA DOSE', style: _labelStyle),
            const SizedBox(height: 8),
            TextField(
              controller: _horaController,
              decoration: const InputDecoration(hintText: 'ex: 08:00'),
            ),
            const SizedBox(height: 20),

            Text('FREQUÊNCIA (EM HORAS)', style: _labelStyle),
            const SizedBox(height: 8),
            TextField(
              controller: _frequenciaController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                hintText: 'ex: 8 (para tomar de 8 em 8h)',
              ),
            ),
            const SizedBox(height: 20),

            Text('LIMITE DE ATRASO (EM MINUTOS)', style: _labelStyle),
            const SizedBox(height: 8),
            TextField(
              controller: _limiteAtrasoController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                hintText: 'ex: 30 (tolerância para alerta)',
              ),
            ),
            const SizedBox(height: 32),

            ElevatedButton(
              onPressed: _isLoading ? null : _salvarMedicamento,
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      isEditando
                          ? 'Atualizar Medicamento'
                          : 'Salvar e Sincronizar',
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
