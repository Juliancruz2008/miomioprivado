# Backend/models/__init__.py
# Importa todas las entidades para que SQLAlchemy las registre
# antes de Base.metadata.create_all(), y para poder hacer
# "from app.models import usuarios, vehiculos, ..." desde cualquier parte.

from app.models.usuario_model import usuarios
from app.models.vehiculo_model import vehiculos
from app.models.estacion_propia_model import EstacionPropia
from app.models.estacion_cargador_model import EstacionCargador
from app.models.reserva_model import Reservas
from app.models.metodo_pago_model import MetodosPago
from app.models.carga_model import Cargas
from app.models.favorito_model import Favoritos
from app.models.reporte_model import Reportes
from app.models.calificacion_model import Calificaciones
from app.models.notificacion_model import Notificacion
from app.models.estado_estacion_model import EstadoEstacion
from app.models.contacto_model import Contacto
from app.models.compra_model import Compras
