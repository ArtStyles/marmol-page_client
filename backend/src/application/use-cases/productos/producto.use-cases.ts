import type { ProductoRepositoryPort } from '../../../domain/ports/index.js'
import type { CreateProductoDto, UpdateProductoDto, ProductoResponseDto } from '../../dtos/index.js'

export class GetProductosUseCase {
  constructor(private readonly repository: ProductoRepositoryPort) {}

  async execute(): Promise<ProductoResponseDto[]> {
    return this.repository.findAll()
  }
}

export class GetProductoByIdUseCase {
  constructor(private readonly repository: ProductoRepositoryPort) {}

  async execute(id: string): Promise<ProductoResponseDto | null> {
    return this.repository.findById(id)
  }
}

export class CreateProductoUseCase {
  constructor(private readonly repository: ProductoRepositoryPort) {}

  async execute(dto: CreateProductoDto): Promise<ProductoResponseDto> {
    return this.repository.create(dto)
  }
}

export class UpdateProductoUseCase {
  constructor(private readonly repository: ProductoRepositoryPort) {}

  async execute(id: string, dto: UpdateProductoDto): Promise<ProductoResponseDto | null> {
    return this.repository.update(id, dto)
  }
}

export class DeleteProductoUseCase {
  constructor(private readonly repository: ProductoRepositoryPort) {}

  async execute(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
